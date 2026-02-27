import { TeamRepository } from "@/infrastructure/db/TeamRepository";
import { TeamPerformanceSupabase } from "@/models/appStatsData/TeamPerformanceSupabase";

export async function getTopPerformingTeamsByYear(
  yearId: string,
): Promise<TeamPerformanceSupabase[]> {
  const teamRepository = new TeamRepository();
  const topPerformingTeams =
    await teamRepository.getTopPerformingTeamsByYear(yearId);
  return topPerformingTeams;
}
