import { describe, it, expectTypeOf } from "vitest";
import type { Tables, TablesInsert } from "@/types/database";
import type { RpcRow } from "@/models/appStatsData/rpc";
import type * as M from "@/models/appStatsData";

describe("models match the generated database types", () => {
  it("table models are the generated Row types", () => {
    expectTypeOf<M.UserTotalStatsSupabase>().toEqualTypeOf<Tables<"user_total_stats">>();
    expectTypeOf<M.ConferenceSupabase>().toEqualTypeOf<Tables<"conferences">>();
    expectTypeOf<M.GameSupabase>().toEqualTypeOf<Tables<"tournament_games">>();
    expectTypeOf<M.PickSupabase>().toEqualTypeOf<Tables<"user_picks">>();
    expectTypeOf<M.BracketSupabase>().toEqualTypeOf<Tables<"user_brackets">>();
    expectTypeOf<M.BracketScoringRuleSupabase>().toEqualTypeOf<Tables<"tournament_scoring_rules">>();
    expectTypeOf<M.ProfileSupabase>().toEqualTypeOf<Tables<"profiles">>();
    expectTypeOf<M.RoundSupabase>().toEqualTypeOf<Tables<"rounds">>();
    expectTypeOf<M.TeamSupabase>().toEqualTypeOf<Tables<"teams">>();
    expectTypeOf<M.YearSupabase>().toEqualTypeOf<Tables<"years">>();
  });
  it("insert models are the generated Insert types", () => {
    expectTypeOf<M.BracketInsertSupabase>().toEqualTypeOf<TablesInsert<"user_brackets">>();
    expectTypeOf<M.GameInsertSupabase>().toEqualTypeOf<TablesInsert<"tournament_games">>();
    expectTypeOf<M.PickInsertSupabase>().toEqualTypeOf<Omit<TablesInsert<"user_picks">, "game_id">>();
  });
  it("every RPC row fits the model its repository returns", () => {
    // TeamRepository -> TeamPerformanceSupabase
    expectTypeOf<RpcRow<"get_top_performing_teams_by_year">>().toMatchTypeOf<M.TeamPerformanceSupabase>();
    expectTypeOf<RpcRow<"get_top_performing_non_power_conference_teams_by_year">>().toMatchTypeOf<M.TeamPerformanceSupabase>();
    expectTypeOf<RpcRow<"get_top_picked_teams_by_year">>().toMatchTypeOf<M.TeamPerformanceSupabase>();
    expectTypeOf<RpcRow<"get_teams_that_caused_most_upsets_by_year">>().toMatchTypeOf<M.TeamPerformanceSupabase>();
    expectTypeOf<RpcRow<"get_most_upset_teams_by_year">>().toMatchTypeOf<M.TeamPerformanceSupabase>();
    expectTypeOf<RpcRow<"get_teams_with_most_championships_by_year">>().toMatchTypeOf<M.TeamPerformanceSupabase>();
    expectTypeOf<RpcRow<"get_teams_with_most_finals_appearances_by_year">>().toMatchTypeOf<M.TeamPerformanceSupabase>();
    expectTypeOf<RpcRow<"get_teams_with_most_final_four_appearances_by_year">>().toMatchTypeOf<M.TeamPerformanceSupabase>();
    expectTypeOf<RpcRow<"get_teams_with_most_elite_eight_appearances_by_year">>().toMatchTypeOf<M.TeamPerformanceSupabase>();
    expectTypeOf<RpcRow<"get_teams_with_most_sweet_sixteen_appearances_by_year">>().toMatchTypeOf<M.TeamPerformanceSupabase>();
    expectTypeOf<RpcRow<"get_teams_with_most_second_round_appearances_by_year">>().toMatchTypeOf<M.TeamPerformanceSupabase>();
    expectTypeOf<RpcRow<"get_teams_with_most_tournament_appearances_by_year">>().toMatchTypeOf<M.TeamPerformanceSupabase>();
    // ConferenceRepository -> ConferencePerformanceSupabase
    expectTypeOf<RpcRow<"get_top_performing_conferences_by_year">>().toMatchTypeOf<M.ConferencePerformanceSupabase>();
    expectTypeOf<RpcRow<"get_top_performing_non_power_conferences_by_year">>().toMatchTypeOf<M.ConferencePerformanceSupabase>();
    expectTypeOf<RpcRow<"get_top_picked_conferences_by_year">>().toMatchTypeOf<M.ConferencePerformanceSupabase>();
    // PickRepository -> TeamPickCountSupabase
    expectTypeOf<RpcRow<"get_top_picked_teams_for_user_and_year">>().toMatchTypeOf<M.TeamPickCountSupabase>();
    // SeedRepository -> SeedPerformanceSupabase
    expectTypeOf<RpcRow<"get_seed_matchup_upset_percentages_by_year_and_round">>().toMatchTypeOf<M.SeedPerformanceSupabase>();
  });
});
