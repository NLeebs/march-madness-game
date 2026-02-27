import { TeamRepository } from "@/infrastructure/db/TeamRepository";
import { TeamPerformanceSupabase } from "@/models/appStatsData";

export async function getTeamsInMostFinalsByYear(
  yearId: string,
): Promise<TeamPerformanceSupabase[]> {
  const teamRepository = new TeamRepository();
  const teamsInMostFinals =
    await teamRepository.getTeamsWithMostFinalsByYear(yearId);
  return teamsInMostFinals;
}
