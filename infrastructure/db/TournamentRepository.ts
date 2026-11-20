import { createSupabaseServiceRoleClient } from "@/infrastructure/db/supabaseServiceRole";
import {
  BracketSupabase,
  BracketScoringRuleSupabase,
  PersistBracketPayload,
  YearSupabase,
  TeamSupabase,
  RoundSupabase,
  UserTotalStatsSupabase,
} from "@/models/appStatsData";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { RoundPoints } from "@/src/functions/tournament";
import type { ScoredRound } from "@/types";

/** rounds.round_name -> the scored round it holds. "champion" is not scored. */
const SCORED_ROUND_BY_NAME: Readonly<Record<string, ScoredRound>> = {
  "1": 1,
  "2": 2,
  "sweet sixteen": "sweet sixteen",
  "elite eight": "elite eight",
  "final four": "final four",
  finals: "finals",
};

export class TournamentRepository {
  private supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = createSupabaseServiceRoleClient();
  }

  async getYears(): Promise<Pick<YearSupabase, "id" | "year">[]> {
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

    return yearData;
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

    return bracketScoringRulesData;
  }

  /** The year's scoring rules, or null when the year has none (e.g. an unknown year id). */
  async findBracketScoringRulesByYearId(
    yearId: string,
  ): Promise<BracketScoringRuleSupabase | null> {
    const { data, error } = await this.supabase
      .from("tournament_scoring_rules")
      .select("*")
      .eq("year_id", yearId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch bracket scoring rules: ${error.message}`);
    }

    return data;
  }

  async getRounds(): Promise<Pick<RoundSupabase, "id" | "round_name">[]> {
    const { data: roundData, error } = await this.supabase
      .from("rounds")
      .select("id, round_name");

    if (error) {
      throw new Error(`Failed to fetch rounds: ${error.message}`);
    }

    return roundData;
  }

  async getTeamsByYearId(
    yearId: string
  ): Promise<Pick<TeamSupabase, "id" | "name">[]> {
    const { data: teamsData, error } = await this.supabase
      .from("teams")
      .select("id, name")
      .eq("year_id", yearId);

    if (error) {
      throw new Error(`Failed to fetch teams: ${error.message}`);
    }

    return teamsData;
  }

  async getBracketsByUserIdAndYearId(
    userId: string,
    yearId: string,
  ): Promise<BracketSupabase[]> {
    const { data: bracketsData, error } = await this.supabase
      .from("user_brackets")
      .select("*")
      .eq("user_id", userId)
      .eq("year_id", yearId);

    if (error) {
      throw new Error(`Failed to fetch brackets: ${error.message}`);
    }

    return bracketsData;
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

    return userTotalStatsData;
  }

  /**
   * Points per correct pick, keyed by scored round. Scoring is global (not per
   * year); a round with several rows uses its latest. Throws if a scored round
   * has no points.
   */
  async getRoundPoints(): Promise<RoundPoints> {
    const { data, error } = await this.supabase
      .from("tournament_round_scoring")
      .select("score, created_at, rounds(round_name)")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch round points: ${error.message}`);
    }

    const points: Partial<Record<ScoredRound, number>> = {};
    data.forEach((row) => {
      const round = row.rounds
        ? SCORED_ROUND_BY_NAME[row.rounds.round_name]
        : undefined;
      if (round !== undefined && points[round] === undefined && row.score !== null) {
        points[round] = row.score;
      }
    });

    const missing = Object.values(SCORED_ROUND_BY_NAME).filter(
      (round) => points[round] === undefined
    );
    if (missing.length > 0) {
      throw new Error(`No round points for rounds: ${missing.join(", ")}`);
    }

    return points as RoundPoints; // cast: every scored round checked above
  }

  /** Saves a bracket, its 67 games and 63 picks in one transaction; returns the bracket id. */
  async persistBracket(payload: PersistBracketPayload): Promise<string> {
    const { data, error } = await this.supabase.rpc("persist_bracket", {
      payload,
    });

    if (error) {
      throw new Error("Failed to persist bracket: " + error.message);
    }

    return data;
  }
}
