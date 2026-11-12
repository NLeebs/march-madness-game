import type {
  getConferenceById,
  getFirstRoundSeedMatchupUpsetPercentageByYearId,
  getTeamById,
  getTopPickedTeamsByUserIdAndYearId,
  getTopPickedTeamsByYear,
  getUserBracketsByYearId,
  getUserProfile,
  getUserTotalStatsByYearId,
} from "@/application/useCases";
import { FAKE_USER } from "../support/fakeAuth";

/**
 * Dashboard data for the two e2e years (ids match E2E_YEARS). Every value that the dashboard
 * shows differs between the years, so a year switch can't pass on stale data. Team logos are
 * empty on purpose: the dashboard then renders the name only and loads no images.
 */
export const DASHBOARD_YEAR_IDS = ["e2e-year-older", "e2e-year-latest"] as const;
export type DashboardYearId = (typeof DASHBOARD_YEAR_IDS)[number];

export function isDashboardYearId(id: string): id is DashboardYearId {
  return (DASHBOARD_YEAR_IDS as readonly string[]).includes(id);
}

type Profile = Awaited<ReturnType<typeof getUserProfile>>;
type Brackets = Awaited<ReturnType<typeof getUserBracketsByYearId>>;
type UserStats = Awaited<ReturnType<typeof getUserTotalStatsByYearId>>;
type UserPicks = Awaited<ReturnType<typeof getTopPickedTeamsByUserIdAndYearId>>;
type Team = Awaited<ReturnType<typeof getTeamById>>;
type Conference = Awaited<ReturnType<typeof getConferenceById>>;
type TeamPerformance = Awaited<ReturnType<typeof getTopPickedTeamsByYear>>;
type SeedPerformance = Awaited<
  ReturnType<typeof getFirstRoundSeedMatchupUpsetPercentageByYearId>
>;

export const DASHBOARD_USERNAME = "e2eplayer";

export const dashboardProfile: Profile = {
  id: FAKE_USER.id,
  username: DASHBOARD_USERNAME,
  favorite_team_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

type YearValues = {
  label: string;
  scores: number[];
  stats: Pick<
    UserStats,
    | "high_score"
    | "low_score"
    | "average_score"
    | "total_brackets"
    | "total_picks"
    | "total_correct_picks"
    | "correct_pick_percentage"
    | "total_first_round_upsets_picked"
    | "total_first_round_upsets_correct"
    | "first_round_upsets_correct_percentage"
    | "last_three_average_score"
    | "last_ten_average_score"
    | "total_top_picked_champion_picks"
    | "total_top_picked_conference_picks"
  >;
  seedUpsetPercentage: number;
};

export const DASHBOARD_YEAR_VALUES: Record<DashboardYearId, YearValues> = {
  "e2e-year-latest": {
    label: "2025",
    scores: [412, 455, 501],
    stats: {
      high_score: 501,
      low_score: 412,
      average_score: 456,
      total_brackets: 3,
      total_picks: 189,
      total_correct_picks: 121,
      correct_pick_percentage: 64,
      total_first_round_upsets_picked: 11,
      total_first_round_upsets_correct: 4,
      first_round_upsets_correct_percentage: 36,
      last_three_average_score: 458,
      last_ten_average_score: 457,
      total_top_picked_champion_picks: 3,
      total_top_picked_conference_picks: 17,
    },
    seedUpsetPercentage: 37,
  },
  "e2e-year-older": {
    label: "2024",
    scores: [388, 430],
    stats: {
      high_score: 430,
      low_score: 388,
      average_score: 409,
      total_brackets: 2,
      total_picks: 126,
      total_correct_picks: 71,
      correct_pick_percentage: 56,
      total_first_round_upsets_picked: 7,
      total_first_round_upsets_correct: 2,
      first_round_upsets_correct_percentage: 29,
      last_three_average_score: 411,
      last_ten_average_score: 412,
      total_top_picked_champion_picks: 2,
      total_top_picked_conference_picks: 9,
    },
    seedUpsetPercentage: 41,
  },
};

export function championTeamId(yearId: DashboardYearId): string {
  return `e2e-champion-${yearId}`;
}
export function conferenceId(yearId: DashboardYearId): string {
  return `e2e-conference-${yearId}`;
}
export function championName(yearId: DashboardYearId): string {
  return `${DASHBOARD_YEAR_VALUES[yearId].label} Champion Pick`;
}
export function conferenceName(yearId: DashboardYearId): string {
  return `${DASHBOARD_YEAR_VALUES[yearId].label} Favourite Conference`;
}
export function userPickName(yearId: DashboardYearId, index: number): string {
  return `${DASHBOARD_YEAR_VALUES[yearId].label} Your Pick ${index}`;
}

export function dashboardBrackets(yearId: DashboardYearId): Brackets {
  return DASHBOARD_YEAR_VALUES[yearId].scores.map((score, i) => ({
    id: `e2e-bracket-${yearId}-${i}`,
    anon_user_id: null,
    created_at: `2026-03-0${i + 1}T12:00:00Z`,
    score,
    tournament_scoring_rules_id: `e2e-rules-${yearId}`,
    user_id: FAKE_USER.id,
    year_id: yearId,
  }));
}

export function dashboardUserStats(yearId: DashboardYearId): UserStats {
  const values = DASHBOARD_YEAR_VALUES[yearId];
  return {
    ...values.stats,
    id: `e2e-stats-${yearId}`,
    user_id: FAKE_USER.id,
    year_id: yearId,
    created_at: "2026-03-01T12:00:00Z",
    updated_at: "2026-03-05T12:00:00Z",
    average_score_rank: null,
    champion_correct_percentage: 33,
    champions_guessed_correctly: 1,
    champions_guessed_correctly_rank: null,
    elite_eight_correct_percentage: 41,
    elite_eights_guessed_correctly: 5,
    final_four_correct_percentage: 38,
    final_fours_guessed_correctly: 4,
    high_score_rank: null,
    round_one_correct_percentage: 71,
    round_two_correct_percentage: 52,
    round_twos_guessed_correctly: 9,
    rounds_ones_guessed_correctly: 20,
    sweet_sixteen_correct_percentage: 45,
    sweet_sixteens_guessed_correctly: 6,
    top_picked_champion_id: championTeamId(yearId),
    top_picked_conference_id: conferenceId(yearId),
    total_elite_eights_picked: 12,
    total_final_fours_picked: 10,
    total_round_ones_picked: 30,
    total_round_twos_picked: 17,
    total_sweet_sixteens_picked: 13,
  };
}

export function dashboardUserPicks(yearId: DashboardYearId): UserPicks {
  return [14, 9, 5].map((pickCount, i) => ({
    conference_id: conferenceId(yearId),
    pick_count: pickCount,
    team_id: `e2e-user-pick-${yearId}-${i}`,
    team_logo: "",
    team_name: userPickName(yearId, i + 1),
  }));
}

export function dashboardTeam(id: string): Team | undefined {
  const yearId = DASHBOARD_YEAR_IDS.find((y) => championTeamId(y) === id);
  if (!yearId) return undefined;
  return {
    id,
    name: championName(yearId),
    team_logo: null,
    conference_id: conferenceId(yearId),
    year_id: yearId,
    created_at: "2026-01-01T00:00:00Z",
  };
}

export function dashboardConference(id: string): Conference | undefined {
  const yearId = DASHBOARD_YEAR_IDS.find((y) => conferenceId(y) === id);
  if (!yearId) return undefined;
  return {
    id,
    conference: conferenceName(yearId),
    conference_logo: null,
    is_power_conference: true,
    created_at: "2026-01-01T00:00:00Z",
  };
}

/** One entry per useMadnessPrep endpoint. `title` is the StatList heading it feeds. */
export type PrepList = { path: string; title: string; label: string };

export const PREP_LISTS: PrepList[] = [
  { path: "/api/teams/top-performers", title: "Top Teams", label: "Top Team" },
  {
    path: "/api/teams/top-performers/non-power-conference",
    title: "Top Cinderellas",
    label: "Cinderella",
  },
  { path: "/api/teams/most-picked", title: "Most Picked Teams", label: "Most Picked" },
  { path: "/api/teams/upsets/caused", title: "Most Upsets", label: "Upset Maker" },
  { path: "/api/teams/upsets/prone", title: "Most Upset Prone", label: "Upset Victim" },
  { path: "/api/teams/appearances/championships", title: "Most Titles", label: "Title Team" },
  { path: "/api/teams/appearances/finals", title: "", label: "Finalist" },
  { path: "/api/teams/appearances/final-fours", title: "Most Final Fours", label: "Final Four" },
  { path: "/api/teams/appearances/elite-eights", title: "Most Elite Eights", label: "Elite Eight" },
  {
    path: "/api/teams/appearances/sweet-sixteens",
    title: "Most Sweet Sixteens",
    label: "Sweet Sixteen",
  },
  {
    path: "/api/teams/appearances/second-rounds",
    title: "Most Second Rounds",
    label: "Second Round",
  },
  { path: "/api/teams/appearances", title: "Most Tournament Appearances", label: "Appearance" },
];

export const SEED_UPSET_PATH = "/api/seeds/first-round/upset-percentage";

/** Name of the i-th team (1-based) in a prep list for a year. The top team is index 1. */
export function prepTeamName(yearId: DashboardYearId, list: PrepList, index: number): string {
  return `${DASHBOARD_YEAR_VALUES[yearId].label} ${list.label} ${index}`;
}

export function dashboardPrepList(yearId: DashboardYearId, list: PrepList): TeamPerformance {
  const metrics = [9, 6, 4];
  return metrics.map((metric, i) => {
    const base = {
      conference_id: conferenceId(yearId),
      team_id: `e2e-prep-${yearId}-${list.label}-${i}`,
      team_logo: "",
      team_name: prepTeamName(yearId, list, i + 1),
    };
    switch (list.path) {
      case "/api/teams/top-performers":
      case "/api/teams/top-performers/non-power-conference":
        return { ...base, tournament_points_scored: metric * 10 };
      case "/api/teams/most-picked":
        return { ...base, picks: metric };
      case "/api/teams/upsets/caused":
        return { ...base, upsets_caused: metric };
      case "/api/teams/upsets/prone":
        return { ...base, times_upset: metric };
      case "/api/teams/appearances/championships":
        return { ...base, championships: metric };
      case "/api/teams/appearances/finals":
        return { ...base, finals: metric };
      case "/api/teams/appearances/final-fours":
        return { ...base, final_fours: metric };
      case "/api/teams/appearances/elite-eights":
        return { ...base, elite_eights: metric };
      case "/api/teams/appearances/sweet-sixteens":
        return { ...base, sweet_sixteens: metric };
      case "/api/teams/appearances/second-rounds":
        return { ...base, second_rounds: metric };
      default:
        return { ...base, tournament_appearances: metric };
    }
  });
}

export function dashboardSeedUpsets(yearId: DashboardYearId): SeedPerformance {
  return [
    {
      higher_seed: 5,
      lower_seed: 12,
      round_id: `e2e-round-${yearId}`,
      upset_percentage: DASHBOARD_YEAR_VALUES[yearId].seedUpsetPercentage,
    },
    {
      higher_seed: 8,
      lower_seed: 9,
      round_id: `e2e-round-${yearId}`,
      upset_percentage: 20,
    },
  ];
}
