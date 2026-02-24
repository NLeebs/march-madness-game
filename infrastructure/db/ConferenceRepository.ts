import { createSupabaseServiceRoleClient } from "@/infrastructure/db/supabaseServiceRole";
import { ConferenceSupabase } from "@/models/appStatsData";
import type { SupabaseClient } from "@supabase/supabase-js";

export class ConferenceRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseServiceRoleClient();
  }

  async getConferenceById(id: string): Promise<ConferenceSupabase> {
    const { data: conferenceData, error: conferenceError } = await this.supabase
      .from("conferences")
      .select("*")
      .eq("id", id)
      .single();

    if (conferenceError) {
      throw new Error(`Failed to fetch conference: ${conferenceError.message}`);
    }

    if (!conferenceData) {
      throw new Error(`No conference found for id: ${id}`);
    }

    return conferenceData as ConferenceSupabase;
  }
}
