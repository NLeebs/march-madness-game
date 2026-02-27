import { TeamRepository } from "@/infrastructure/db/TeamRepository";
import { TeamPerformanceSupabase } from "@/models/appStatsData";

export async function getTopPickedTeamsByYear(
  yearId: string,
): Promise<TeamPerformanceSupabase[]> {
  const teamRepository = new TeamRepository();
  const topPickedTeams = await teamRepository.getMostPickedTeamsByYear(yearId);
  return topPickedTeams;
}
