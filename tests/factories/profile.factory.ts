import { ProfileSupabase } from "@/models/appStatsData/ProfileSupabase";

export function buildProfile(
  overrides: Partial<ProfileSupabase> = {}
): ProfileSupabase {
  return {
    id: "user-uuid-123",
    username: "bracketMaster",
    favorite_team_id: "team-uuid-456",
    created_at: "2025-01-15T12:00:00Z",
    updated_at: "2025-03-01T08:30:00Z",
    ...overrides,
  };
}
