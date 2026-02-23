import { createSupabaseServiceRoleClient } from "@/infrastructure/db/supabaseServiceRole";
import { createSupabaseServerClient } from "@/infrastructure/db/supabaseServer";
import {
  BracketSupabase,
  BracketScoringRuleSupabase,
  GameSupabase,
  PickSupabase,
  YearSupabase,
  TeamSupabase,
  RoundSupabase,
  UserTotalStatsSupabase,
} from "@/models/appStatsData";
import { MappedRowsResult } from "@/application/mappers/mapTournamentToRows";
import type { SupabaseClient } from "@supabase/supabase-js";

interface PersistTournamentData {
  bracket: BracketSupabase;
  gamesAndPicks: MappedRowsResult;
}

export class TournamentRepository {
  private supabase: SupabaseClient;
  private authClient: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseServiceRoleClient();
    this.authClient = createSupabaseServerClient();
  }

  async getYears(): Promise<YearSupabase[]> {
    const { data: yearsData, error: yearsError } = await this.supabase
      .from("years")
      .select("id, year");

    if (yearsError) {
      throw new Error(`Failed to fetch years: ${yearsError.message}`);
    }

    return yearsData;
  }

  async getYearById(yearId: string): Promise<YearSupabase> {
    const { data: yearData, error: yearError } = await this.supabase
      .from("years")
      .select("*")
      .eq("id", yearId)
      .single();

    if (yearError) {
      throw new Error(`Failed to fetch year: ${yearError.message}`);
    }

    if (!yearData) {
      throw new Error(`No year found for id: ${yearId}`);
    }

    return yearData as YearSupabase;
  }

  async getBracketScoringRulesByYearId(
    yearId: string,
  ): Promise<BracketScoringRuleSupabase> {
    const { data: bracketScoringRulesData, error: bracketScoringRulesError } =
      await this.supabase
        .from("tournament_scoring_rules")
        .select("*")
        .eq("year_id", yearId)
        .single();

    if (bracketScoringRulesError) {
      throw new Error(
        `Failed to fetch bracket scoring rules: ${bracketScoringRulesError.message}`,
      );
    }

    if (!bracketScoringRulesData) {
      throw new Error(`No bracket scoring rules found for year_id: ${yearId}`);
    }

    return bracketScoringRulesData as BracketScoringRuleSupabase;
  }

  async getRounds(): Promise<RoundSupabase[]> {
    const { data: roundData, error } = await this.supabase
      .from("rounds")
      .select("id, round_name");

    if (error) {
      throw new Error(`Failed to fetch rounds: ${error.message}`);
    }

    return roundData as RoundSupabase[];
  }

  async getTeamsByYearId(yearId: string): Promise<TeamSupabase[]> {
    const { data: teamsData, error } = await this.supabase
      .from("teams")
      .select("id, name")
      .eq("year_id", yearId);

    if (error) {
      throw new Error(`Failed to fetch teams: ${error.message}`);
    }

    return teamsData as TeamSupabase[];
  }

  async getBracketsByUserIdAndYearId(
    userId: string,
    yearId: string,
  ): Promise<BracketSupabase[]> {
    const { data: bracketsData, error } = await this.supabase
      .from("user_brackets")
      .select("score, created_at")
      .eq("user_id", userId)
      .eq("year_id", yearId);

    if (error) {
      throw new Error(`Failed to fetch brackets: ${error.message}`);
    }

    return bracketsData as BracketSupabase[];
  }

  async getUserTotalStatsByYearId(
    userId: string,
    yearId: string,
  ): Promise<UserTotalStatsSupabase> {
    const { data: userTotalStatsData, error } = await this.supabase
      .from("user_total_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("year_id", yearId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch user total stats: ${error.message}`);
    }

    if (!userTotalStatsData) {
      throw new Error(
        `No user total stats found for user_id: ${userId} and year_id: ${yearId}`,
      );
    }

    return userTotalStatsData as UserTotalStatsSupabase;
  }

  async persistBracket(bracket: BracketSupabase): Promise<string> {
    if (bracket.user_id) {
      const {
        data: { user },
        error: authError,
      } = await this.authClient.auth.getUser();

      if (authError || !user || user.id !== bracket.user_id) {
        throw new Error(
          `Authentication failed: ${
            authError?.message || "User not authenticated"
          }`,
        );
      }
    }

    const { data: bracketData, error: bracketError } = await this.supabase
      .from("user_brackets")
      .insert(bracket)
      .select("id")
      .single();

    if (bracketError || !bracketData) {
      if (
        bracketError?.code === "42501" ||
        bracketError?.message?.includes("row-level security")
      ) {
        throw new Error(
          `RLS Policy Violation: Failed to create bracket. ` +
            `Policy requires: user_id IS NULL AND anon_user_id IS NOT NULL. ` +
            `Received: user_id=${bracket.user_id}, anon_user_id=${bracket.anon_user_id}. ` +
            `Error: ${bracketError?.message}`,
        );
      }
      throw new Error(`Failed to create bracket: ${bracketError?.message}`);
    }

    return bracketData.id;
  }

  async persistTournament({
    bracket,
    gamesAndPicks,
  }: PersistTournamentData): Promise<void> {
    if (!bracket.id) {
      throw new Error(
        "Bracket must have an ID before persisting games and picks",
      );
    }

    if (bracket.user_id) {
      const {
        data: { user },
        error: authError,
      } = await this.authClient.auth.getUser();

      if (authError) {
        throw new Error(`Authentication failed: ${authError?.message}`);
      }
    }

    const persistGame = async (game: GameSupabase) => {
      const { data: gameData, error: gameError } = await this.supabase
        .from("tournament_games")
        .insert(game)
        .select("id")
        .single();

      if (gameError) {
        throw new Error(`Failed to insert game: ${gameError.message}`);
      }

      return gameData.id;
    };

    const persistPick = async (pick: PickSupabase) => {
      const { error: pickError } = await this.supabase
        .from("user_picks")
        .insert(pick);

      if (pickError) {
        throw new Error(`Failed to insert pick: ${pickError.message}`);
      }
    };

    await Promise.all(
      gamesAndPicks.map(async (gameAndPick) => {
        const { game, pick } = gameAndPick;
        const gameId = await persistGame(game);

        if (pick && pick.bracket_id) {
          const completePick: PickSupabase = {
            ...pick,
            game_id: gameId,
          };
          await persistPick(completePick);
        }
      }),
    );
  }
}
