import { createSupabaseServerClient } from "@/infrastructure/db/supabaseServer";
import {
  BracketSupabase,
  GameSupabase,
  PickSupabase,
  YearSupabase,
  TeamSupabase,
  RoundSupabase,
} from "@/models/appStatsData";
import { MappedRowsResult } from "@/application/mappers/mapTournamentToRows";
import { BracketScoringRuleSupabase } from "@/models/appStatsData/BracketScoringRuleSupabase";
import type { SupabaseClient } from "@supabase/supabase-js";

interface PersistTournamentData {
  bracket: BracketSupabase;
  gamesAndPicks: MappedRowsResult;
}

export class TournamentRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseServerClient();
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
    yearId: string
  ): Promise<BracketScoringRuleSupabase> {
    const { data: bracketScoringRulesData, error: bracketScoringRulesError } =
      await this.supabase
        .from("tournament_scoring_rules")
        .select("*")
        .eq("year_id", yearId)
        .single();

    if (bracketScoringRulesError) {
      throw new Error(
        `Failed to fetch bracket scoring rules: ${bracketScoringRulesError.message}`
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

  async persistBracket(bracket: BracketSupabase): Promise<string> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error || !user) {
      throw new Error(
        `Authentication failed: ${
          error?.message || "User not authenticated to persist bracket"
        }`
      );
    }

    const { data: bracketData, error: bracketError } = await this.supabase
      .from("user_brackets")
      .insert(bracket)
      .select("id")
      .single();

    if (bracketError || !bracketData) {
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
        "Bracket must have an ID before persisting games and picks"
      );
    }

    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();

    if (authError || !user) {
      throw new Error(
        `Authentication failed: ${
          authError?.message || "User not authenticated to persist tournament"
        }`
      );
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
      })
    );
  }
}
