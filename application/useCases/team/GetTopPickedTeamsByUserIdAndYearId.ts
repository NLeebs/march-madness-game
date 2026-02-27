import { PickRepository } from "@/infrastructure/db/PickRepository";
import { TeamPickCountSupabase } from "@/models/appStatsData/TeamPickCountSupabase";

export async function getTopPickedTeamsByUserIdAndYearId(
  userId: string,
  yearId: string,
): Promise<TeamPickCountSupabase[]> {
  const pickRepository = new PickRepository();
  const topTeamPickCount =
    await pickRepository.getTopPickedTeamsByUserIdAndYearId(userId, yearId);
  return topTeamPickCount;
}
