import { TeamStats } from "@/models/teamData/TeamStats";
import { TeamOffensiveStats } from "@/models/teamData/TeamOffensiveStats";
import { TeamDefensiveStats } from "@/models/teamData/TeamDefensiveStats";
import { TeamMap } from "@/models/teamData/TeamMap";
import { ConferenceMap } from "@/models";
import { YearSupabase } from "@/models/appStatsData/YearSupabase";

export function buildOffensiveStats(
  overrides: Partial<TeamOffensiveStats> = {}
): TeamOffensiveStats {
  return {
    "draw-foul-percentage": 0.2,
    "free-throw-percentage": 0.75,
    "offensive-rebound-percentage": 0.3,
    "three-point-percentage": 0.35,
    "two-point-attempt-percentage": 0.48,
    "two-point-percentage": 0.5,
    ...overrides,
  };
}

export function buildDefensiveStats(
  overrides: Partial<TeamDefensiveStats> = {}
): TeamDefensiveStats {
  return {
    "cause-turnover-percentage": 0.22,
    "commit-foul-percentage": 0.18,
    "defensive-rebound-percentage": 0.72,
    "opp-three-point-percentage": 0.31,
    "opp-two-point-percentage": 0.44,
    ...overrides,
  };
}

export function buildTeamStats(
  overrides: Partial<TeamStats> = {}
): TeamStats {
  return {
    name: "Duke",
    logo: "duke-logo.png",
    mascot: "Blue Devils",
    possessions: "70.5",
    rpi: "0.65",
    "schedule-strength": "0.58",
    "primary-color": "#003366",
    "secondary-color": "#FFFFFF",
    "stats-offensive": buildOffensiveStats(),
    "stats-defense": buildDefensiveStats(),
    ...overrides,
  };
}

export function buildTeamMap(
  teams: Record<string, Partial<TeamStats>> = {}
): TeamMap {
  const map: TeamMap = {};
  for (const [name, overrides] of Object.entries(teams)) {
    map[name] = buildTeamStats({ name, ...overrides });
  }
  return map;
}

export function buildConferenceMap(
  conferences: Record<string, Record<string, Partial<TeamStats>>> = {}
): ConferenceMap {
  const map: ConferenceMap = {};
  for (const [conference, teams] of Object.entries(conferences)) {
    map[conference] = buildTeamMap(teams);
  }
  return map;
}

export function buildYear(
  overrides: Partial<YearSupabase> = {}
): YearSupabase {
  return {
    id: "year-uuid-123",
    year: 2025,
    ...overrides,
  };
}
