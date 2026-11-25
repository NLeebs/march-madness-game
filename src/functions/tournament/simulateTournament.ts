import { GameDataError } from "@/src/functions/generic/GameDataError";
import { playGame } from "@/src/functions/playGame";
import { emptyBracket } from "@/src/functions/tournament/emptyState";
import {
  applyGameResult,
  applyPlayinResult,
  type PlayinGameResult,
} from "@/src/functions/tournament/applyGameResult";
import { buildRoundOneMatchups } from "@/src/functions/tournament/buildRoundOneMatchups";
import { getTournamentGameResultObj } from "@/src/functions/tournament/getTournamentGameResultObj";
import { replacePlayinPlaceholder } from "@/src/functions/tournament/picks";
import {
  ROUND_CONFIG,
  SCORED_ROUNDS,
} from "@/src/functions/tournament/roundConfig";
import {
  scoreRound,
  type RoundPoints,
} from "@/src/functions/tournament/scoreRound";
import { seedTournament } from "@/src/functions/tournament/seedTournament";
import type { ConferenceMap, TeamStats } from "@/models";
import type {
  BracketMatchups,
  PlayinSeedType,
  ScoredRound,
  TournamentGameResult,
  TournamentPicks,
  TournamentRegion,
  TournamentRoundMatchups,
} from "@/types";

export interface TournamentField {
  /** The 60 non-play-in teams, rank order. */
  tournamentTeams: string[];
  /** 4 teams per play-in seed line. */
  playinTeams: Record<PlayinSeedType, string[]>;
}

export interface TournamentPlayResult {
  /** With scores, in play order. */
  playin: PlayinGameResult[];
  /** Seed set on each game. */
  rounds: Record<ScoredRound, TournamentGameResult[]>;
  roundPoints: Record<ScoredRound, number>;
  score: number;
}

export interface SimulateTournamentInput {
  field: TournamentField;
  picks: TournamentPicks;
  teamStats: ConferenceMap;
  points: RoundPoints;
  rng?: () => number;
}

/**
 * Plays the whole tournament: the play-in games, then every round, in the
 * same order as the browser drivers (PlayPlayinGames, PlayTournamentGames), so
 * the random draws line up. Pure: inputs are never mutated.
 * `bracket` is the final bracket; `picks` has the play-in placeholders replaced.
 */
export function simulateTournament(
  input: SimulateTournamentInput
): TournamentPlayResult & { bracket: BracketMatchups; picks: TournamentPicks } {
  const { field, teamStats, points, rng } = input;

  const statsByTeam = new Map<string, TeamStats>();
  Object.values(teamStats).forEach((conference) => {
    Object.entries(conference).forEach(([team, stats]) => {
      statsByTeam.set(team, stats);
    });
  });
  const statsOf = (team: string): TeamStats => {
    const stats = statsByTeam.get(team);
    if (!stats) {
      throw new GameDataError("simulateTournament: team has no stats", {
        team,
      });
    }
    return stats;
  };
  const play = (a: string, b: string) => playGame(statsOf(a), statsOf(b), rng);

  const seeds = seedTournament(field.tournamentTeams);
  const roundOne = buildRoundOneMatchups(seeds, field.playinTeams);
  let bracket: BracketMatchups = {
    ...emptyBracket(),
    roundOneMatchups: roundOne,
  };
  let picks = input.picks;

  // Play-in
  const playin: PlayinGameResult[] = [];
  const playinMatchups = roundOne.playin;
  (Object.keys(playinMatchups) as PlayinSeedType[]).forEach((seedType) => {
    playinMatchups[seedType].forEach((matchup, i) => {
      const { gameIndex, winningTeam, winningScore, losingScore } =
        getTournamentGameResultObj(play(matchup[0].team, matchup[1].team), i);
      const result: PlayinGameResult = {
        gameIndex,
        winningTeam,
        seedType,
        winningScore,
        losingScore,
      };
      picks = replacePlayinPlaceholder(picks, result);
      bracket = {
        ...bracket,
        roundOneMatchups: applyPlayinResult(bracket.roundOneMatchups, result),
      };
      playin.push(result);
    });
  });

  // Rounds
  const rounds = {} as Record<ScoredRound, TournamentGameResult[]>;
  const roundPoints = {} as Record<ScoredRound, number>;
  let score = 0;
  SCORED_ROUNDS.forEach((round) => {
    const { matchupsKey, nextPicksKey } = ROUND_CONFIG[round];
    const roundMatchups = bracket[matchupsKey] as TournamentRoundMatchups;
    const results: TournamentGameResult[] = [];
    const winningTeams: string[] = [];

    (Object.keys(roundMatchups) as (TournamentRegion | "playin")[]).forEach(
      (region) => {
        if (region === "playin") return;
        roundMatchups[region]?.forEach((matchup, i) => {
          const result = getTournamentGameResultObj(
            play(matchup[0].team, matchup[1].team),
            i,
            region
          );
          result.seed =
            result.winningTeam === matchup[0].team
              ? matchup[0].seed
              : matchup[1].seed;
          bracket = applyGameResult(bracket, round, result);
          results.push(result);
          winningTeams.push(result.winningTeam);
        });
      }
    );

    const { points: earned } = scoreRound({
      round,
      advanced: picks[nextPicksKey],
      picks: picks[nextPicksKey],
      winningTeams,
      points,
    });
    rounds[round] = results;
    roundPoints[round] = earned;
    score += earned;
  });

  return { playin, rounds, roundPoints, score, bracket, picks };
}
