import { BracketSupabase } from "@/models/appStatsData/BracketSupabase";

export function buildBracket(
  overrides: Partial<BracketSupabase> = {}
): BracketSupabase {
  return {
    id: "bracket-uuid-1",
    user_id: "user-uuid-123",
    anon_user_id: null,
    year_id: "year-uuid-1",
    tournament_scoring_rules_id: "scoring-rules-uuid-1",
    score: 42,
    created_at: "2025-03-20T10:00:00Z",
    ...overrides,
  };
}
