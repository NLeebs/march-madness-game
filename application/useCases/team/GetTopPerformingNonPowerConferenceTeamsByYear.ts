import { TeamRepository } from "@/infrastructure/db/TeamRepository";
import { TeamPerformanceSupabase } from "@/models/appStatsData";

export async function getTopPerformingNonPowerConferenceTeamsByYear(
  yearId: string,
): Promise<TeamPerformanceSupabase[]> {
  const teamRepository = new TeamRepository();
  const topPerformingNonPowerConferenceTeams =
    await teamRepository.getTopPerformingNonPowerConferenceTeamsByYear(yearId);
  return topPerformingNonPowerConferenceTeams;
}
