import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { ProfileSupabase } from "@/models/appStatsData";

export async function getUserProfile(userId: string): Promise<ProfileSupabase> {
  const tournamentRepository = new TournamentRepository();
  const profile = await tournamentRepository.getProfileByUserId(userId);
  return profile;
}
