import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { getTeamStatisticsByYearId } from "@/application/useCases/team/GetTeamStatisticsByYearId";
import { mapBracketToPayloadGames } from "@/application/mappers/mapBracketToPayload";
import { buildRoundOneMatchups } from "@/src/functions/tournament/buildRoundOneMatchups";
import { seedTournament } from "@/src/functions/tournament/seedTournament";
import {
  simulateTournament,
  type TournamentField,
  type TournamentPlayResult,
} from "@/src/functions/tournament/simulateTournament";
import { validateBracketPicks } from "@/src/functions/tournament/validateBracketPicks";
import { ValidationError } from "@/utils/errorHandling";
import type { ConferenceMap } from "@/models";
import type { PersistBracketPayload } from "@/models/appStatsData";
import type { TournamentPicks, TournamentRound } from "@/types";

export interface PlayTournamentDto {
  yearId: string;
  field: TournamentField;
  picks: TournamentPicks;
  userId: string | null;
  anonUserId: string | null;
}

export type PlayTournamentResult = TournamentPlayResult & { bracketId: string };

const FIELD_SIZE = 68;

/** rounds.round_name -> round identifier. */
const ROUND_BY_NAME: Readonly<Record<string, TournamentRound>> = {
  "1": 1,
  "2": 2,
  "sweet sixteen": "sweet sixteen",
  "elite eight": "elite eight",
  "final four": "final four",
  finals: "finals",
  champion: "champion",
};

/**
 * Plays the tournament on the server for a player's picks, scores it with the
 * stored round points, and saves the bracket, its games and picks in one RPC.
 * Bad input (no owner, a field team unknown for the year, inconsistent picks)
 * throws ValidationError; anything else (load or save failures) is a server
 * error.
 */
export async function playTournament({
  yearId,
  field,
  picks,
  userId,
  anonUserId,
}: PlayTournamentDto): Promise<PlayTournamentResult> {
  if (!userId && !anonUserId) {
    throw new ValidationError("A bracket needs a userId or an anonUserId");
  }

  const fieldTeams = [
    ...field.tournamentTeams,
    ...field.playinTeams.elevenSeeds,
    ...field.playinTeams.sixteenSeeds,
  ];
  const duplicates = fieldTeams.filter((team, i) => fieldTeams.indexOf(team) !== i);
  if (duplicates.length > 0) {
    throw new ValidationError(
      `Field teams appear more than once: ${Array.from(new Set(duplicates)).join(", ")}`
    );
  }
  if (fieldTeams.length !== FIELD_SIZE) {
    throw new ValidationError(
      `The field needs ${FIELD_SIZE} teams, got ${fieldTeams.length}`
    );
  }

  const repository = new TournamentRepository();
  const loads = await Promise.allSettled([
    getTeamStatisticsByYearId(yearId),
    repository.getTeamsByYearId(yearId),
    repository.getRounds(),
    repository.getRoundPoints(),
    repository.findBracketScoringRulesByYearId(yearId),
  ]);
  // A year without scoring rules is an unknown year: the other loads may fail
  // for the same reason, so this check comes before rethrowing their errors.
  if (loads[4].status === "fulfilled" && loads[4].value === null) {
    throw new ValidationError(`Unknown year: ${yearId}`);
  }
  const teamStats = settled(loads[0]);
  const teams = settled(loads[1]);
  const rounds = settled(loads[2]);
  const points = settled(loads[3]);
  const scoringRules = settled(loads[4]);
  if (scoringRules === null) {
    throw new ValidationError(`Unknown year: ${yearId}`);
  }

  const statsTeams = teamNamesWithStats(teamStats);
  const withoutStats = fieldTeams.filter((team) => !statsTeams.has(team));
  if (withoutStats.length > 0) {
    throw new ValidationError(
      `Field teams have no stats for this year: ${withoutStats.join(", ")}`
    );
  }

  const teamIdMap = new Map(teams.map((team) => [team.name, team.id]));
  const unknown = fieldTeams.filter((team) => !teamIdMap.has(team));
  if (unknown.length > 0) {
    throw new ValidationError(
      `Field teams are not teams of this year: ${unknown.join(", ")}`
    );
  }

  const roundOne = buildRoundOneMatchups(
    seedTournament(field.tournamentTeams),
    field.playinTeams
  );
  const problems = validateBracketPicks(roundOne, picks);
  if (problems.length > 0) {
    throw new ValidationError(`Inconsistent picks: ${problems.join("; ")}`);
  }

  const { bracket, picks: playedPicks, ...result } = simulateTournament({
    field,
    picks,
    teamStats,
    points,
    rng: Math.random,
  });

  const roundIdMap = new Map<TournamentRound, string>();
  rounds.forEach((round) => {
    const key = ROUND_BY_NAME[round.round_name];
    if (key !== undefined) roundIdMap.set(key, round.id);
  });

  const payload: PersistBracketPayload = {
    bracket: {
      user_id: userId ?? null,
      anon_user_id: userId ? null : anonUserId,
      year_id: yearId,
      tournament_scoring_rules_id: scoringRules.id,
      score: result.score,
    },
    games: mapBracketToPayloadGames({
      bracket,
      picks: playedPicks,
      teamIdMap,
      roundIdMap,
    }),
  };

  const bracketId = await repository.persistBracket(payload);

  return { bracketId, ...result };
}

function teamNamesWithStats(teamStats: ConferenceMap): Set<string> {
  return new Set(
    Object.values(teamStats).flatMap((conference) => Object.keys(conference))
  );
}

/** The value of a settled load, rethrowing its error (a server error) if it failed. */
function settled<T>(result: PromiseSettledResult<T>): T {
  if (result.status === "rejected") throw result.reason;
  return result.value;
}
