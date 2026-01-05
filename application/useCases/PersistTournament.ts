import { TournamentState } from "@/store/tournamentSlice";
import { TournamentPlayerPicks, TournamentRound } from "@/types";
import { mapTournamentToRows } from "@/application/mappers/mapTournamentToRows";
import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { supabase } from "@/infrastructure/db/supabaseClient";
import { BracketSupabase } from "@/models/appStatsData";

interface PersistTournamentData {
  tournamentState: TournamentState;
  picksState: TournamentPlayerPicks;
  userId: string;
}

interface PersistTournamentResult {
  bracketId: string;
  success: boolean;
}

export async function persistTournament({
  tournamentState,
  picksState,
  userId,
}: PersistTournamentData): Promise<PersistTournamentResult> {
  const teamIdMap = await fetchTeamIdMap(tournamentState.yearId);
  const roundIdMap = await fetchRoundIdMap();
  const yearId = tournamentState.yearId;
  const tournamentScoringRulesId = tournamentState.tournamentScoringRulesId;

  const repository = new TournamentRepository();
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

async function fetchTeamIdMap(yearId: string): Promise<Map<string, string>> {
  const { data: teamData, error } = await supabase
    .from("teams")
    .select("id, name")
    .eq("year_id", yearId);

  if (error) {
    throw new Error(`Failed to fetch teams: ${error.message}`);
  }

  const teamMap = new Map<string, string>();
  teamData?.forEach((team) => {
    teamMap.set(team.name, team.id);
  });

  return teamMap;
}

async function fetchRoundIdMap(): Promise<Map<TournamentRound, string>> {
  const { data: roundData, error } = await supabase
    .from("rounds")
    .select("id, round_name");

  if (error) {
    throw new Error(`Failed to fetch rounds: ${error.message}`);
  }

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
  roundData?.forEach((round) => {
    const mappedName = roundNameMapping[round.round_name];
    roundMap.set(mappedName, round.id);
  });

  return roundMap;
}
