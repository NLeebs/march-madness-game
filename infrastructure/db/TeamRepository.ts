import { createSupabaseServiceRoleClient } from "@/infrastructure/db/supabaseServiceRole";
import { TeamSupabase } from "@/models/appStatsData/TeamSupabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export class TeamRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseServiceRoleClient();
  }

  async getTeamById(id: string): Promise<TeamSupabase> {
    const { data: teamData, error: teamError } = await this.supabase
      .from("teams")
      .select("*")
      .eq("id", id)
      .single();

    if (teamError) {
      throw new Error(`Failed to fetch team: ${teamError.message}`);
    }

    if (!teamData) {
      throw new Error(`No team found for id: ${id}`);
    }

    return teamData as TeamSupabase;
  }
}
