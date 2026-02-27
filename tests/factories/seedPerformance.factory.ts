import { SeedPerformanceSupabase } from "@/models/appStatsData/SeedPerformanceSupabase";

export function buildSeedPerformance(
  overrides: Partial<SeedPerformanceSupabase> = {},
): SeedPerformanceSupabase {
  return {
    upset_percentage: 52.3,
    higher_seed: 5,
    lower_seed: 12,
    round_id: "11111111-1111-1111-1111-111111111111",
    ...overrides,
  };
}
