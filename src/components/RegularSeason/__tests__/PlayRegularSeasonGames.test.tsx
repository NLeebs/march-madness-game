import React from "react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { act, cleanup } from "@testing-library/react";
import type { AnyAction, Middleware } from "@reduxjs/toolkit";
import { regularSeasonRecordActions } from "@/store";
import { compactSeason, expandSeason } from "@/src/functions/regularSeason/seasonWire";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";
import { createFastStore } from "@/tests/game/helpers/fastStore";
import { recordActions, renderWithStore } from "@/tests/game/helpers/renderWithStore";
import { mulberry32 } from "@/tests/game/helpers/rng";
import { GAME_TEST_TIMEOUT } from "@/tests/game/helpers/timeout";
import type { GameResult } from "@/types";

// Spy on the engine: the replay must never play a game itself.
vi.mock("@/src/functions/playGame", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/functions/playGame")>();
  return { ...actual, playGame: vi.fn(actual.playGame) };
});

import { playGame } from "@/src/functions/playGame";
import { simulateSeason } from "@/src/functions/regularSeason/simulateSeason";
import { PlayRegularSeasonGames } from "../PlayRegularSeasonGames";

const league = buildLeague();
// Built once, before any test clears the playGame spy.
const season = (() => {
  const wire = compactSeason(simulateSeason(league.teamStats, mulberry32(7)));
  const { weeks, selection } = expandSeason(wire, league.teamStats);
  return { weeks, selection };
})();

const GAME = regularSeasonRecordActions.addRegularSeasonGameResult.type;
const WEEK = regularSeasonRecordActions.addWeekPlayedToTotal.type;
const WEEK_RESULTS = "regularSeasonRecords/addRegularSeasonWeekResults";
const SELECTION_SUNDAY = "appState/activateSelectionSunday";

function setup({ withSeason, extra = [] }: { withSeason: boolean; extra?: Middleware[] }) {
  const { middleware, actions } = recordActions();
  const store = createFastStore({ extraMiddleware: [middleware, ...extra] });
  configureStoreForLeague(store, league);
  if (withSeason) store.dispatch(regularSeasonRecordActions.setSeason(season));
  actions.length = 0;
  return { store, actions };
}

const replayActions = (actions: AnyAction[]) =>
  actions.filter((a) => [GAME, WEEK_RESULTS, WEEK, SELECTION_SUNDAY].includes(a.type));

/** Each week's results in one addRegularSeasonWeekResults, then that week's increment. */
function expectFullReplay(actions: AnyAction[]) {
  const replay = replayActions(actions);
  const expectedTypes = season.weeks.flatMap(() => [WEEK_RESULTS, WEEK]);
  const firstSunday = replay.findIndex((a) => a.type === SELECTION_SUNDAY);
  expect(firstSunday).toBe(expectedTypes.length);
  expect(replay.slice(0, firstSunday).map((a) => a.type)).toEqual(expectedTypes);
  expect(replay.slice(firstSunday).every((a) => a.type === SELECTION_SUNDAY)).toBe(true);
  const played = replay.filter((a) => a.type === WEEK_RESULTS).map((a) => a.payload as GameResult[]);
  expect(played).toEqual(season.weeks);
}

const WEEK_MS = 150;
const WEEKS = season.weeks.length;

/** Advances fake time inside act. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const weeksIn = (actions: AnyAction[]) => actions.filter((a) => a.type === WEEK).length;

describe("PlayRegularSeasonGames", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.mocked(playGame).mockClear();
  });

  it(
    "replays week n at n x 150 ms, in schedule order, then activateSelectionSunday",
    async () => {
      vi.useFakeTimers();
      const { store, actions } = setup({ withSeason: true });

      renderWithStore(<PlayRegularSeasonGames />, store);
      for (let week = 0; week < WEEKS; week++) {
        await advance(WEEK_MS - 1);
        expect(weeksIn(actions), `week ${week + 1} early`).toBe(week);
        await advance(1);
        expect(weeksIn(actions), `week ${week + 1} on time`).toBe(week + 1);
        expect(actions.filter((a) => a.type === WEEK_RESULTS)).toHaveLength(week + 1);
      }

      expectFullReplay(actions);
      const state = store.getState();
      expect(state.regularSeasonRecords.weeksPlayed).toBe(30);
      expect(state.appState.selectionSunday).toBe(true);
    },
    GAME_TEST_TIMEOUT
  );

  it(
    "replay waits for the season and then plays all 30 weeks",
    async () => {
      vi.useFakeTimers();
      const { store, actions } = setup({ withSeason: false });

      renderWithStore(<PlayRegularSeasonGames />, store);
      await advance(5000);
      expect(replayActions(actions)).toEqual([]);
      expect(store.getState().regularSeasonRecords.weeksPlayed).toBe(0);

      await act(async () => {
        store.dispatch(regularSeasonRecordActions.setSeason(season));
      });
      await advance(WEEK_MS - 1);
      expect(weeksIn(actions)).toBe(0);
      await advance(WEEKS * WEEK_MS - (WEEK_MS - 1));

      expectFullReplay(actions);
      expect(store.getState().regularSeasonRecords.weeksPlayed).toBe(30);
    },
    GAME_TEST_TIMEOUT
  );

  it(
    "stops on unmount and resumes from weeksPlayed on remount",
    async () => {
      vi.useFakeTimers();
      const { store, actions } = setup({ withSeason: true });

      const first = renderWithStore(<PlayRegularSeasonGames />, store);
      await advance(10 * WEEK_MS);
      expect(store.getState().regularSeasonRecords.weeksPlayed).toBe(10);
      first.unmount();
      const atUnmount = actions.length;
      await advance(5000);
      expect(actions.length).toBe(atUnmount);
      expect(store.getState().regularSeasonRecords.weeksPlayed).toBe(10);

      renderWithStore(<PlayRegularSeasonGames />, store);
      await advance((WEEKS - 10) * WEEK_MS);

      expectFullReplay(actions);
      expect(store.getState().regularSeasonRecords.weeksPlayed).toBe(30);
    },
    GAME_TEST_TIMEOUT
  );

  it(
    "a slow week delays the next one without skipping or doubling",
    async () => {
      vi.useFakeTimers();
      // The replay paces itself with performance.now(), so a slow week is
      // modelled as that clock jumping 400 ms while week 1 is applied.
      let slowed = false;
      const fakeNow = performance.now.bind(performance);
      const nowSpy = vi
        .spyOn(performance, "now")
        .mockImplementation(() => fakeNow() + (slowed ? 400 : 0));
      const slowFirstWeek: Middleware = () => (next) => (action) => {
        const result = next(action);
        if ((action as AnyAction).type === WEEK) slowed = true;
        return result;
      };
      const { store, actions } = setup({ withSeason: true, extra: [slowFirstWeek] });

      renderWithStore(<PlayRegularSeasonGames />, store);
      await advance(WEEK_MS);
      expect(weeksIn(actions)).toBe(1);
      // Week 1 took 400 ms: weeks 2 and 3 were already due, so they follow at once
      // (1 ms: fake timers run a 0 ms timeout on the next tick, not within advance(0)).
      await advance(1);
      expect(weeksIn(actions)).toBeGreaterThanOrEqual(2);
      await advance(WEEKS * WEEK_MS);

      expectFullReplay(actions);
      expect(store.getState().regularSeasonRecords.weeksPlayed).toBe(30);
      nowSpy.mockRestore();
    },
    GAME_TEST_TIMEOUT
  );

  it(
    "never calls playGame",
    async () => {
      vi.useFakeTimers();
      vi.mocked(playGame).mockClear();
      const { store } = setup({ withSeason: true });

      renderWithStore(<PlayRegularSeasonGames />, store);
      await advance(5000);

      expect(store.getState().regularSeasonRecords.weeksPlayed).toBe(30);
      expect(playGame).not.toHaveBeenCalled();
    },
    GAME_TEST_TIMEOUT
  );
});
