import { RoundSupabase } from "@/models/appStatsData/RoundSupabase";

export function buildRound(
  overrides: Partial<RoundSupabase> = {},
): RoundSupabase {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    round_name: "First Round",
    created_at: "2025-03-20T10:00:00Z",
    ...overrides,
  };
}
