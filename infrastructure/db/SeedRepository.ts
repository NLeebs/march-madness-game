import { createSupabaseServiceRoleClient } from "@/infrastructure/db/supabaseServiceRole";
import { SeedPerformanceSupabase } from "@/models/appStatsData";
import type { SupabaseClient } from "@supabase/supabase-js";

export class SeedRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseServiceRoleClient();
  }

  async getFirstRoundSeedMatchupUpsetPercentagesByYearId(
    yearId: string,
  ): Promise<SeedPerformanceSupabase[]> {
    const { data: seedPerformanceData, error: seedPerformanceError } =
      await this.supabase.rpc(
        "get_seed_matchup_upset_percentages_by_year_and_round",
        {
          p_year_id: yearId,
          p_round_id: "1",
        },
      );

    if (seedPerformanceError) {
      throw new Error(
        `Failed to fetch seed performance: ${seedPerformanceError.message}`,
      );
    }

    if (!seedPerformanceData) {
      throw new Error(`No seed performance found for year_id: ${yearId}`);
    }

    return seedPerformanceData as SeedPerformanceSupabase[];
  }
}
