import { TeamRepository } from "@/infrastructure/db/TeamRepository";
import { TeamPerformanceSupabase } from "@/models/appStatsData";

export async function getTeamsMostUpsetProneByYearId(
  yearId: string,
): Promise<TeamPerformanceSupabase[]> {
  const teamRepository = new TeamRepository();
  const teamsMostUpsetProne =
    await teamRepository.getTeamsMostUpsetByYear(yearId);
  return teamsMostUpsetProne;
}
