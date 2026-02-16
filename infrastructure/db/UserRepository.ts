import { createSupabaseServiceRoleClient } from "@/infrastructure/db/supabaseServiceRole";
import { ProfileSupabase } from "@/models/appStatsData";
import type { SupabaseClient } from "@supabase/supabase-js";

export class UserRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseServiceRoleClient();
  }

  async getProfileByUserId(userId: string): Promise<ProfileSupabase> {
    const { data: userProfileData, error: userProfileError } =
      await this.supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (userProfileError) {
      throw new Error(
        `Failed to fetch user profile: ${userProfileError.message}`,
      );
    }

    if (!userProfileData) {
      throw new Error(`No user profile found for id: ${userId}`);
    }

    return userProfileData as ProfileSupabase;
  }
}
