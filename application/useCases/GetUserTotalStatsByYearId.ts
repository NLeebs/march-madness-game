import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { UserTotalStatsSupabase } from "@/models/appStatsData/UserTotalStatsSupabase";

export async function getUserTotalStatsByYearId(
  userId: string,
  yearId: string,
): Promise<UserTotalStatsSupabase> {
  const tournamentRepository = new TournamentRepository();
  const userTotalStats = await tournamentRepository.getUserTotalStatsByYearId(
    userId,
    yearId,
  );
  return userTotalStats;
}
