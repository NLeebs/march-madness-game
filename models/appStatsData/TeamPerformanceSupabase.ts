import type { RpcRow } from "./rpc";

type TeamPerformanceBase = Pick<
  RpcRow<"get_top_performing_teams_by_year">,
  "team_id" | "team_name" | "team_logo" | "conference_id"
>;

// Each team RPC returns the base columns plus one metric column.
export type TeamPerformanceSupabase = TeamPerformanceBase &
  Partial<
    Pick<RpcRow<"get_top_performing_teams_by_year">, "tournament_points_scored"> &
      Pick<RpcRow<"get_top_picked_teams_by_year">, "picks"> &
      Pick<RpcRow<"get_most_upset_teams_by_year">, "times_upset"> &
      Pick<RpcRow<"get_teams_that_caused_most_upsets_by_year">, "upsets_caused"> &
      Pick<RpcRow<"get_teams_with_most_championships_by_year">, "championships"> &
      Pick<RpcRow<"get_teams_with_most_finals_appearances_by_year">, "finals"> &
      Pick<RpcRow<"get_teams_with_most_final_four_appearances_by_year">, "final_fours"> &
      Pick<RpcRow<"get_teams_with_most_elite_eight_appearances_by_year">, "elite_eights"> &
      Pick<RpcRow<"get_teams_with_most_sweet_sixteen_appearances_by_year">, "sweet_sixteens"> &
      Pick<RpcRow<"get_teams_with_most_second_round_appearances_by_year">, "second_rounds"> &
      Pick<RpcRow<"get_teams_with_most_tournament_appearances_by_year">, "tournament_appearances">
  >;
