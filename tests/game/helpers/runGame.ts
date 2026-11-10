import React from "react";
import { act } from "@testing-library/react";
import { vi } from "vitest";
import { SeasonSchedule } from "@/src/components/RegularSeason/SeasonSchedule";
import { PlayRegularSeasonGames } from "@/src/components/RegularSeason/PlayRegularSeasonGames";
import type { AppStore } from "@/store/store";
import type { League } from "@/tests/factories";
import type { RegularSeasonTeam } from "@/types";
import { renderWithStore } from "./renderWithStore";

const SEASON_WEEKS = 30;
const STEP_MS = 500;
const MAX_STEPS = 10;

/**
 * Plays a whole regular season on a store already configured for the league
 * (see configureStoreForLeague): renders SeasonSchedule (builds the schedule),
 * then PlayRegularSeasonGames, and advances fake timers until weeksPlayed === 30
 * and appState.selectionSunday is true.
 *
 * Contract with the caller:
 * - Fake timers: playSeason switches them on if they are not already on
 *   (vi.useFakeTimers()), and never switches them off. The caller restores real
 *   timers (vi.useRealTimers()) in afterEach.
 * - Math.random: playSeason does not seed it. The caller seeds with
 *   seedMathRandom(seed) before calling and restores afterwards.
 * - Rendered components stay mounted. The caller calls cleanup() afterwards.
 */
export async function playSeason(store: AppStore, league: League): Promise<void> {
  if (!vi.isFakeTimers()) vi.useFakeTimers();
  renderWithStore(
    React.createElement(SeasonSchedule, {
      teamStats: league.teamStats,
      teamArray: store.getState().teamSchedule.teamArray,
    }),
    store,
  );
  renderWithStore(
    React.createElement(PlayRegularSeasonGames, { teamStats: league.teamStats }),
    store,
  );
  for (let i = 0; i < MAX_STEPS; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(STEP_MS);
    });
    const state = store.getState();
    if (
      state.regularSeasonRecords.weeksPlayed === SEASON_WEEKS &&
      state.appState.selectionSunday
    )
      return;
  }
  throw new Error("playSeason: season did not finish");
}

/**
 * Hand-built season records for the league: one entry per team, inserted in
 * league order (conference by conference), so Object.keys(records) order is
 * the league order. `index` is the team's position in that order.
 */
export function buildRecords(
  league: League,
  scoreFor: (team: string, index: number) => { wins: number; score: number },
): Record<string, RegularSeasonTeam> {
  const records: Record<string, RegularSeasonTeam> = {};
  let index = 0;
  for (const teams of Object.values(league.conferenceArrays))
    for (const team of teams) {
      const { wins, score } = scoreFor(team, index);
      records[team] = { wins, losses: 30 - wins, tournamentSelectionScore: score };
      index++;
    }
  return records;
}

/** RPI rank (1 = best) per team name, from the league fixture. */
export function rpiByTeam(league: League): Record<string, number> {
  const rpi: Record<string, number> = {};
  for (const teams of Object.values(league.teamStats))
    for (const [name, stats] of Object.entries(teams)) rpi[name] = Number(stats.rpi);
  return rpi;
}
