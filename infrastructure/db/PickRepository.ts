import { createSupabaseServiceRoleClient } from "@/infrastructure/db/supabaseServiceRole";
import { TeamPickCountSupabase } from "@/models/appStatsData/TeamPickCountSupabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export class PickRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseServiceRoleClient();
  }

  async getTopPickedTeamsByUserIdAndYearId(
    userId: string,
    yearId: string,
  ): Promise<TeamPickCountSupabase[]> {
    const { data: pickCountData, error: pickCountError } =
      await this.supabase.rpc("get_top_picked_teams_for_user_and_year", {
        user_id: userId,
        year_id: yearId,
      });

    if (pickCountError) {
      throw new Error(
        `Failed to fetch top picked teams: ${pickCountError.message}`,
      );
    }

    if (!pickCountData) {
      throw new Error(
        `No top picked teams found for user_id: ${userId} and year_id: ${yearId}`,
      );
    }

    return pickCountData as TeamPickCountSupabase[];
  }
}
