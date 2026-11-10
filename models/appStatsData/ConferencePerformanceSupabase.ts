import type { RpcRow } from "./rpc";

type ConferencePerformanceBase = Pick<
  RpcRow<"get_top_performing_conferences_by_year">,
  "conference_id" | "conference_name" | "conference_logo"
>;

// Each conference RPC returns the base columns plus one metric column.
export type ConferencePerformanceSupabase = ConferencePerformanceBase &
  Partial<
    Pick<RpcRow<"get_top_performing_conferences_by_year">, "wins"> &
      Pick<RpcRow<"get_top_picked_conferences_by_year">, "picks">
  >;
