import { createSupabaseServiceRoleClient } from "@/infrastructure/db/supabaseServiceRole";
import { TeamPerformanceSupabase, TeamSupabase } from "@/models/appStatsData";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export class TeamRepository {
  private supabase: SupabaseClient<Database>;

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

    return teamData;
  }

  async getTopPerformingTeamsByYear(
    yearId: string,
  ): Promise<TeamPerformanceSupabase[]> {
    const { data: teamPerformanceData, error: teamPerformanceError } =
      await this.supabase.rpc("get_top_performing_teams_by_year", {
        p_year_id: yearId,
      });

    if (teamPerformanceError) {
      throw new Error(
        `Failed to fetch top performing teams: ${teamPerformanceError.message}`,
      );
    }

    if (!teamPerformanceData) {
      throw new Error(`No top performing teams found for year_id: ${yearId}`);
    }

    return teamPerformanceData;
  }

  async getTopPerformingNonPowerConferenceTeamsByYear(
    yearId: string,
  ): Promise<TeamPerformanceSupabase[]> {
    const { data: teamPerformanceData, error: teamPerformanceError } =
      await this.supabase.rpc(
        "get_top_performing_non_power_conference_teams_by_year",
        {
          p_year_id: yearId,
        },
      );

    if (teamPerformanceError) {
      throw new Error(
        `Failed to fetch top performing teams: ${teamPerformanceError.message}`,
      );
    }

    if (!teamPerformanceData) {
      throw new Error(`No top performing teams found for year_id: ${yearId}`);
    }

    return teamPerformanceData;
  }

  async getMostPickedTeamsByYear(
    yearId: string,
  ): Promise<TeamPerformanceSupabase[]> {
    const { data: teamPickData, error: teamPickError } =
      await this.supabase.rpc("get_top_picked_teams_by_year", {
        p_year_id: yearId,
      });

    if (teamPickError) {
      throw new Error(
        `Failed to fetch most picked teams: ${teamPickError.message}`,
      );
    }

    if (!teamPickData) {
      throw new Error(`No most picked teams found for year_id: ${yearId}`);
    }

    return teamPickData;
  }

  async getTeamsWithMostUpsetsCausedByYear(
    yearId: string,
  ): Promise<TeamPerformanceSupabase[]> {
    const { data: teamUpsetsData, error: teamUpsetsError } =
      await this.supabase.rpc("get_teams_that_caused_most_upsets_by_year", {
        p_year_id: yearId,
      });

    if (teamUpsetsError) {
      throw new Error(
        `Failed to fetch teams with most upsets caused: ${teamUpsetsError.message}`,
      );
    }

    if (!teamUpsetsData) {
      throw new Error(
        `No teams with most upsets caused found for year_id: ${yearId}`,
      );
    }

    return teamUpsetsData;
  }

  async getTeamsMostUpsetByYear(
    yearId: string,
  ): Promise<TeamPerformanceSupabase[]> {
    const { data: teamUpsetsData, error: teamUpsetsError } =
      await this.supabase.rpc("get_most_upset_teams_by_year", {
        p_year_id: yearId,
      });

    if (teamUpsetsError) {
      throw new Error(
        `Failed to fetch teams with most upsets: ${teamUpsetsError.message}`,
      );
    }

    if (!teamUpsetsData) {
      throw new Error(`No teams with most upsets found for year_id: ${yearId}`);
    }

    return teamUpsetsData;
  }

  async getTeamsWithMostChampionshipsByYear(
    yearId: string,
  ): Promise<TeamPerformanceSupabase[]> {
    const { data: appearanceData, error: appearanceError } =
      await this.supabase.rpc("get_teams_with_most_championships_by_year", {
        p_year_id: yearId,
      });

    if (appearanceError) {
      throw new Error(
        `Failed to fetch teams with most championships: ${appearanceError.message}`,
      );
    }

    if (!appearanceData) {
      throw new Error(
        `No teams with most championships found for year_id: ${yearId}`,
      );
    }

    return appearanceData;
  }

  async getTeamsWithMostFinalsByYear(
    yearId: string,
  ): Promise<TeamPerformanceSupabase[]> {
    const { data: appearanceData, error: appearanceError } =
      await this.supabase.rpc(
        "get_teams_with_most_finals_appearances_by_year",
        {
          p_year_id: yearId,
        },
      );

    if (appearanceError) {
      throw new Error(
        `Failed to fetch teams with most finals: ${appearanceError.message}`,
      );
    }

    if (!appearanceData) {
      throw new Error(`No teams with most finals found for year_id: ${yearId}`);
    }

    return appearanceData;
  }

  async getTeamsWithMostFinalFoursByYear(
    yearId: string,
  ): Promise<TeamPerformanceSupabase[]> {
    const { data: appearanceData, error: appearanceError } =
      await this.supabase.rpc(
        "get_teams_with_most_final_four_appearances_by_year",
        {
          p_year_id: yearId,
        },
      );

    if (appearanceError) {
      throw new Error(
        `Failed to fetch teams with most final fours: ${appearanceError.message}`,
      );
    }

    if (!appearanceData) {
      throw new Error(
        `No teams with most final fours found for year_id: ${yearId}`,
      );
    }

    return appearanceData;
  }

  async getTeamsWithMostEliteEightsByYear(
    yearId: string,
  ): Promise<TeamPerformanceSupabase[]> {
    const { data: appearanceData, error: appearanceError } =
      await this.supabase.rpc(
        "get_teams_with_most_elite_eight_appearances_by_year",
        {
          p_year_id: yearId,
        },
      );

    if (appearanceError) {
      throw new Error(
        `Failed to fetch teams with most elite eights: ${appearanceError.message}`,
      );
    }

    if (!appearanceData) {
      throw new Error(
        `No teams with most elite eights found for year_id: ${yearId}`,
      );
    }

    return appearanceData;
  }

  async getTeamsWithMostSweetSixteensByYear(
    yearId: string,
  ): Promise<TeamPerformanceSupabase[]> {
    const { data: appearanceData, error: appearanceError } =
      await this.supabase.rpc(
        "get_teams_with_most_sweet_sixteen_appearances_by_year",
        {
          p_year_id: yearId,
        },
      );

    if (appearanceError) {
      throw new Error(
        `Failed to fetch teams with most sweet sixteens: ${appearanceError.message}`,
      );
    }

    if (!appearanceData) {
      throw new Error(
        `No teams with most sweet sixteens found for year_id: ${yearId}`,
      );
    }

    return appearanceData;
  }

  async getTeamsWithMostSecondRoundsByYear(
    yearId: string,
  ): Promise<TeamPerformanceSupabase[]> {
    const { data: appearanceData, error: appearanceError } =
      await this.supabase.rpc(
        "get_teams_with_most_second_round_appearances_by_year",
        {
          p_year_id: yearId,
        },
      );

    if (appearanceError) {
      throw new Error(
        `Failed to fetch teams with most second rounds: ${appearanceError.message}`,
      );
    }

    if (!appearanceData) {
      throw new Error(
        `No teams with most second rounds found for year_id: ${yearId}`,
      );
    }

    return appearanceData;
  }

  async getTeamsWithMostTournamentAppearancesByYear(
    yearId: string,
  ): Promise<TeamPerformanceSupabase[]> {
    const { data: appearanceData, error: appearanceError } =
      await this.supabase.rpc(
        "get_teams_with_most_tournament_appearances_by_year",
        {
          p_year_id: yearId,
        },
      );

    if (appearanceError) {
      throw new Error(
        `Failed to fetch teams with most tournament appearances: ${appearanceError.message}`,
      );
    }

    if (!appearanceData) {
      throw new Error(
        `No teams with most tournament appearances found for year_id: ${yearId}`,
      );
    }

    return appearanceData;
  }
}
