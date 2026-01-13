import { TournamentState } from "@/store/tournamentSlice";
import { TournamentPlayerPicks, TournamentRound } from "@/types";
import { mapTournamentToRows } from "@/application/mappers/mapTournamentToRows";
import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { BracketSupabase } from "@/models/appStatsData";

export interface PersistTournamentDto {
  tournamentState: TournamentState;
  picksState: TournamentPlayerPicks;
  userId: string;
}

export interface PersistTournamentResult {
  bracketId: string;
  success: boolean;
}

export async function persistTournament({
  tournamentState,
  picksState,
  userId,
}: PersistTournamentDto): Promise<PersistTournamentResult> {
  const repository = new TournamentRepository();

  const teamIdMap = await fetchTeamIdMap(tournamentState.yearId, repository);
  const roundIdMap = await fetchRoundIdMap(repository);
  const yearId = tournamentState.yearId;
  const tournamentScoringRulesId = tournamentState.tournamentScoringRulesId;

  const bracket: BracketSupabase = {
    user_id: userId,
    year_id: yearId,
    tournament_scoring_rules_id: tournamentScoringRulesId,
    score: tournamentState.playerScore,
  };
  const bracketId = await repository.persistBracket(bracket);

  const gamesAndPicks = mapTournamentToRows({
    bracketId,
    tournamentState,
    picksState,
    teamIdMap,
    roundIdMap,
  });

  await repository.persistTournament({
    bracket: { ...bracket, id: bracketId },
    gamesAndPicks,
  });

  return {
    bracketId,
    success: true,
  };
}

async function fetchTeamIdMap(
  yearId: string,
  repository: TournamentRepository
): Promise<Map<string, string>> {
  const teams = await repository.getTeamsByYearId(yearId);

  const teamMap = new Map<string, string>();
  teams?.forEach((team) => {
    teamMap.set(team.name, team.id);
  });

  return teamMap;
}

async function fetchRoundIdMap(
  repository: TournamentRepository
): Promise<Map<TournamentRound, string>> {
  const rounds = await repository.getRounds();

  const roundNameMapping: Record<string, TournamentRound> = {
    "1": 1,
    "2": 2,
    "sweet sixteen": "sweet sixteen",
    "elite eight": "elite eight",
    "final four": "final four",
    finals: "finals",
    champion: "champion",
  };

  const roundMap = new Map<TournamentRound, string>();
  rounds?.forEach((round) => {
    const mappedName = roundNameMapping[round.round_name];
    roundMap.set(mappedName, round.id);
  });

  return roundMap;
}
