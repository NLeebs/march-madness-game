import { AMOUNT_SEASON_GAMES } from "@/src/constants";
import type { ConferenceMap } from "@/models";
import type {
  ConferenceArrays,
  GameResult,
  RegularSeasonTeam,
  TeamSchedule,
} from "@/types";
import { playGame } from "@/src/functions/playGame";
import {
  createSeasonSchedule,
  type ScheduledGame,
} from "@/src/functions/regularSeason/createSeasonSchedule";
import { applySeasonGameResult } from "@/src/functions/regularSeason/applySeasonGameResult";
import {
  selectTournamentField,
  type TournamentFieldSelection,
} from "@/src/functions/regularSeason/selectTournamentField";

export interface SeasonSimulation {
  /** Conference keys, then team keys, in Object.keys order (as teamScheduleConfig). */
  teamArray: TeamSchedule[];
  schedule: ScheduledGame[];
  /** weeks[0] = week1 ... weeks[29] = week30, games in schedule order. */
  weeks: GameResult[][];
  /** Final records, without conference champion flags. */
  records: Record<string, RegularSeasonTeam>;
  selection: TournamentFieldSelection;
}

/**
 * Plays a whole regular season and picks the tournament field. Pure and
 * server-safe. Draws `rng` for the schedule first, then for the games, in the
 * order the browser did.
 */
export function simulateSeason(
  teamStats: ConferenceMap,
  rng: () => number = Math.random
): SeasonSimulation {
  const teamArray: TeamSchedule[] = [];
  const conferenceArrays: ConferenceArrays = {};
  const records: Record<string, RegularSeasonTeam> = {};
  for (const conference of Object.keys(teamStats)) {
    conferenceArrays[conference] = Object.keys(teamStats[conference]);
    for (const team of conferenceArrays[conference]) {
      teamArray.push({ team, conference });
      records[team] = { wins: 0, losses: 0, tournamentSelectionScore: 0 };
    }
  }

  const schedule = createSeasonSchedule(teamStats, teamArray, rng);

  const gamesByWeek = new Map<string, TeamSchedule[][]>();
  for (const { weekNumber, matchup } of schedule) {
    const games = gamesByWeek.get(weekNumber);
    if (games) games.push(matchup);
    else gamesByWeek.set(weekNumber, [matchup]);
  }

  const weeks: GameResult[][] = [];
  for (let week = 1; week <= AMOUNT_SEASON_GAMES; week++) {
    const results = (gamesByWeek.get(`week${week}`) ?? []).map(
      ([a, b]) =>
        playGame(teamStats[a.conference][a.team], teamStats[b.conference][b.team], rng)
    );
    results.forEach((result) => applySeasonGameResult(records, result));
    weeks.push(results);
  }

  return {
    teamArray,
    schedule,
    weeks,
    records,
    selection: selectTournamentField(records, conferenceArrays),
  };
}
