import { TeamSupabase } from "@/models/appStatsData/TeamSupabase";

export function buildTeam(
  overrides: Partial<TeamSupabase> = {},
): TeamSupabase {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Duke",
    year_id: "22222222-2222-2222-2222-222222222222",
    conference_id: "33333333-3333-3333-3333-333333333333",
    team_logo: "/team-logos/acc/duke.png",
    created_at: "2025-03-20T10:00:00Z",
    ...overrides,
  };
}
