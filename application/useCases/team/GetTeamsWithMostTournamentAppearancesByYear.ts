import { TeamRepository } from "@/infrastructure/db/TeamRepository";
import { TeamPerformanceSupabase } from "@/models/appStatsData";

export async function getTeamsWithMostTournamentAppearancesByYear(
  yearId: string,
): Promise<TeamPerformanceSupabase[]> {
  const teamRepository = new TeamRepository();
  const teamsWithMostTournamentAppearances =
    await teamRepository.getTeamsWithMostTournamentAppearancesByYear(yearId);
  return teamsWithMostTournamentAppearances;
}
