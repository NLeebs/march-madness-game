import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { BracketSupabase } from "@/models/appStatsData";

export async function getUserBracketsByYearId(
  userId: string,
  yearId: string,
): Promise<BracketSupabase[]> {
  const tournamentRepository = new TournamentRepository();
  const brackets = await tournamentRepository.getBracketsByUserIdAndYearId(
    userId,
    yearId,
  );
  return brackets;
}
