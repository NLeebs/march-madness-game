import { TeamRepository } from "@/infrastructure/db/TeamRepository";
import { TeamPerformanceSupabase } from "@/models/appStatsData";

export async function getTeamsInMostEliteEightsByYear(
  yearId: string,
): Promise<TeamPerformanceSupabase[]> {
  const teamRepository = new TeamRepository();
  const teamsInMostEliteEights =
    await teamRepository.getTeamsWithMostEliteEightsByYear(yearId);
  return teamsInMostEliteEights;
}
