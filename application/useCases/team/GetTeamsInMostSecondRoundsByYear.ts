import { TeamRepository } from "@/infrastructure/db/TeamRepository";
import { TeamPerformanceSupabase } from "@/models/appStatsData";

export async function getTeamsInMostSecondRoundsByYear(
  yearId: string,
): Promise<TeamPerformanceSupabase[]> {
  const teamRepository = new TeamRepository();
  const teamsInMostSecondRounds =
    await teamRepository.getTeamsWithMostSecondRoundsByYear(yearId);
  return teamsInMostSecondRounds;
}
