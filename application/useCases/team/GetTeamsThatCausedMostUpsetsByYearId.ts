import { TeamRepository } from "@/infrastructure/db/TeamRepository";
import { TeamPerformanceSupabase } from "@/models/appStatsData";

export async function getTeamsThatCausedMostUpsetsByYearId(
  yearId: string,
): Promise<TeamPerformanceSupabase[]> {
  const teamRepository = new TeamRepository();
  const teamsThatCausedMostUpsets =
    await teamRepository.getTeamsWithMostUpsetsCausedByYear(yearId);
  return teamsThatCausedMostUpsets;
}
