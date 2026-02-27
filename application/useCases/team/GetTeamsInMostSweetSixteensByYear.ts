import { TeamRepository } from "@/infrastructure/db/TeamRepository";
import { TeamPerformanceSupabase } from "@/models/appStatsData";

export async function getTeamsInMostSweetSixteensByYear(
  yearId: string,
): Promise<TeamPerformanceSupabase[]> {
  const teamRepository = new TeamRepository();
  const teamsInMostSweetSixteens =
    await teamRepository.getTeamsWithMostSweetSixteensByYear(yearId);
  return teamsInMostSweetSixteens;
}
