import { UserRepository } from "@/infrastructure/db/UserRepository";
import { ProfileSupabase } from "@/models/appStatsData";

export async function getUserProfile(userId: string): Promise<ProfileSupabase> {
  const userRepository = new UserRepository();
  const profile = await userRepository.getProfileByUserId(userId);
  return profile;
}
