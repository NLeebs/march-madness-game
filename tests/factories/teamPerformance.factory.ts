import { TeamPerformanceSupabase } from "@/models/appStatsData/TeamPerformanceSupabase";

export function buildTeamPerformance(
  overrides: Partial<TeamPerformanceSupabase> = {},
): TeamPerformanceSupabase {
  return {
    team_id: "11111111-1111-1111-1111-111111111111",
    team_name: "Houston",
    team_logo: "/team-logos/big-12/houston.png",
    conference_id: "22222222-2222-2222-2222-222222222222",
    tournament_points_scored: 128,
    picks: 17,
    times_upset: 1,
    upsets_caused: 3,
    championships: 0,
    finals: 1,
    final_fours: 2,
    elite_eights: 3,
    sweet_sixteens: 4,
    second_rounds: 5,
    tournament_appearances: 8,
    ...overrides,
  };
}
