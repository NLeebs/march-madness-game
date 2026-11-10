import { ConferenceMap } from "@/models";
import { TeamStats } from "@/models/teamData/TeamStats";
import { ConferenceArrays, TeamSchedule } from "@/types";
import { numberOfConferences } from "@/src/components/Add-To-Firebase/teamStatURLUtils";
import { teamStatsActions } from "@/store/teamStatsSlice";
import { teamScheduleActions } from "@/store/teamScheduleSlice";
import { regularSeasonRecordActions } from "@/store/regularSeasonRecordSlice";
import type { AppStore } from "@/store/store";
import { mulberry32 } from "@/tests/game/helpers/rng";
import { buildTeamStats } from "./teamStats.factory";

export interface League {
  teamStats: ConferenceMap;
  conferenceArrays: ConferenceArrays;
  teamArray: TeamSchedule[];
}

const TOTAL_TEAMS = 360;
const LEAGUE_SEED = 20240311;

const pad = (n: number, width: number) => String(n).padStart(width, "0");

/** Conference sizes summing to TOTAL_TEAMS, with several odd sizes. */
function conferenceSizes(count: number): number[] {
  const base = Math.floor(TOTAL_TEAMS / count);
  const sizes = Array.from({ length: count }, () => base);
  let remainder = TOTAL_TEAMS - base * count;
  for (let i = 0; remainder > 0; i = (i + 1) % count, remainder--) {
    sizes[i] += 1;
  }
  // Shift one team between neighbours so parities vary; total is preserved.
  for (let i = 0; i + 1 < count && i < 6; i += 2) {
    sizes[i] += 1;
    sizes[i + 1] -= 1;
  }
  return sizes;
}

/** Maps a quality score (0 worst, 1 best) plus noise onto [min, max]. */
function scale(min: number, max: number, quality: number, noise: number) {
  const x = Math.min(1, Math.max(0, quality * 0.7 + noise * 0.3));
  return Number((min + (max - min) * x).toFixed(3));
}

function shuffledRanks(rand: () => number): number[] {
  const ranks = Array.from({ length: TOTAL_TEAMS }, (_, i) => i + 1);
  for (let i = ranks.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ranks[i], ranks[j]] = [ranks[j], ranks[i]];
  }
  return ranks;
}

/**
 * Deterministic 360-team league. rpi and schedule-strength are rank strings
 * (1 = best), like the scraped data.
 */
export function buildLeague(): League {
  const rand = mulberry32(LEAGUE_SEED);
  const rpiRanks = shuffledRanks(rand);
  const sosRanks = shuffledRanks(rand);

  const sizes = conferenceSizes(numberOfConferences);
  const teamStats: ConferenceMap = {};
  const conferenceArrays: ConferenceArrays = {};
  const teamArray: TeamSchedule[] = [];

  let teamNumber = 0;
  sizes.forEach((size, c) => {
    const conference = `conf${pad(c + 1, 2)}`;
    teamStats[conference] = {};
    for (let k = 0; k < size; k++) {
      const name = `team${pad(teamNumber + 1, 3)}`;
      const rank = rpiRanks[teamNumber];
      const q = 1 - (rank - 1) / (TOTAL_TEAMS - 1);
      const n = () => rand();
      const stats: TeamStats = buildTeamStats({
        name,
        logo: `${name}.png`,
        mascot: `${name} mascot`,
        rpi: String(rank),
        "schedule-strength": String(sosRanks[teamNumber]),
        possessions: String(62 + Math.floor(rand() * 13)),
        "stats-offensive": {
          "draw-foul-percentage": scale(0.12, 0.24, q, n()),
          "free-throw-percentage": scale(0.28, 0.58, q, n()),
          "offensive-rebound-percentage": scale(0.22, 0.78, q, n()),
          "three-point-percentage": scale(0.28, 0.58, q, n()),
          "two-point-attempt-percentage": scale(0.28, 0.58, 0.5, n()),
          "two-point-percentage": scale(0.28, 0.58, q, n()),
        },
        "stats-defense": {
          "cause-turnover-percentage": scale(0.12, 0.24, q, n()),
          "commit-foul-percentage": scale(0.12, 0.24, 1 - q, n()),
          "defensive-rebound-percentage": scale(0.22, 0.78, q, n()),
          "opp-three-point-percentage": scale(0.28, 0.58, 1 - q, n()),
          "opp-two-point-percentage": scale(0.28, 0.58, 1 - q, n()),
        },
      });
      teamStats[conference][name] = stats;
      teamArray.push({ team: name, conference });
      teamNumber++;
    }
    conferenceArrays[conference] = Object.keys(teamStats[conference]);
  });

  return { teamStats, conferenceArrays, teamArray };
}

/** Dispatches exactly what StartScreen does when a year's stats load. */
export function configureStoreForLeague(store: AppStore, league: League): void {
  store.dispatch(teamStatsActions.addToStateFromDB(league.teamStats));
  store.dispatch(teamStatsActions.addConferenceArrays(league.teamStats));
  store.dispatch(teamScheduleActions.teamScheduleConfig(league.teamStats));
  store.dispatch(
    regularSeasonRecordActions.regularSeasonRecordConfig(league.teamStats)
  );
}
