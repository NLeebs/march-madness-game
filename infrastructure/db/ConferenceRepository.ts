import { createSupabaseServiceRoleClient } from "@/infrastructure/db/supabaseServiceRole";
import {
  ConferenceSupabase,
  ConferencePerformanceSupabase,
} from "@/models/appStatsData";
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

  async getTopPerformingConferencesByYear(
    yearId: string,
  ): Promise<ConferencePerformanceSupabase[]> {
    const {
      data: conferencePerformanceData,
      error: conferencePerformanceError,
    } = await this.supabase.rpc("get_top_performing_conferences_by_year", {
      p_year_id: yearId,
    });
    if (conferencePerformanceError) {
      throw new Error(
        `Failed to fetch top performing conferences: ${conferencePerformanceError.message}`,
      );
    }
    if (!conferencePerformanceData) {
      throw new Error(
        `No top performing conferences found for year_id: ${yearId}`,
      );
    }
    return conferencePerformanceData as ConferencePerformanceSupabase[];
  }

  async getTopPerformingNonPowerConferencesByYear(
    yearId: string,
  ): Promise<ConferencePerformanceSupabase[]> {
    const {
      data: conferencePerformanceData,
      error: conferencePerformanceError,
    } = await this.supabase.rpc(
      "get_top_performing_non_power_conferences_by_year",
      {
        p_year_id: yearId,
      },
    );
    if (conferencePerformanceError) {
      throw new Error(
        `Failed to fetch top performing conferences: ${conferencePerformanceError.message}`,
      );
    }
    if (!conferencePerformanceData) {
      throw new Error(
        `No top performing conferences found for year_id: ${yearId}`,
      );
    }
    return conferencePerformanceData as ConferencePerformanceSupabase[];
  }

  async getTopPickedConferencesByYear(
    yearId: string,
  ): Promise<ConferencePerformanceSupabase[]> {
    const { data: conferencePickData, error: conferencePickError } =
      await this.supabase.rpc("get_top_picked_conferences_by_year", {
        p_year_id: yearId,
      });

    if (conferencePickError) {
      throw new Error(
        `Failed to fetch top picked conferences: ${conferencePickError.message}`,
      );
    }
    if (!conferencePickData) {
      throw new Error(`No top picked conferences found for year_id: ${yearId}`);
    }
    return conferencePickData as ConferencePerformanceSupabase[];
  }
}
