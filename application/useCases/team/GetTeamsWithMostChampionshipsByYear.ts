import { TeamRepository } from "@/infrastructure/db/TeamRepository";
import { TeamPerformanceSupabase } from "@/models/appStatsData";

export async function getTeamsWithMostChampionshipsByYear(
  yearId: string,
): Promise<TeamPerformanceSupabase[]> {
  const teamRepository = new TeamRepository();
  const teamsWithMostChampionships =
    await teamRepository.getTeamsWithMostChampionshipsByYear(yearId);
  return teamsWithMostChampionships;
}
