import { TeamRepository } from "@/infrastructure/db/TeamRepository";
import { TeamPerformanceSupabase } from "@/models/appStatsData";

export async function getTeamsInMostFinalFoursByYear(
  yearId: string,
): Promise<TeamPerformanceSupabase[]> {
  const teamRepository = new TeamRepository();
  const teamsInMostFinalFours =
    await teamRepository.getTeamsWithMostFinalFoursByYear(yearId);
  return teamsInMostFinalFours;
}
