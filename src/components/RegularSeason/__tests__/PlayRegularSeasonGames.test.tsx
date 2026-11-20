import React from "react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { act, cleanup } from "@testing-library/react";
import type { AnyAction } from "@reduxjs/toolkit";
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
const SELECTION_SUNDAY = "appState/activateSelectionSunday";

function setup({ withSeason }: { withSeason: boolean }) {
  const { middleware, actions } = recordActions();
  const store = createFastStore({ extraMiddleware: [middleware] });
  configureStoreForLeague(store, league);
  if (withSeason) store.dispatch(regularSeasonRecordActions.setSeason(season));
  actions.length = 0;
  return { store, actions };
}

const replayActions = (actions: AnyAction[]) =>
  actions.filter((a) => [GAME, WEEK, SELECTION_SUNDAY].includes(a.type));

/** Today's order: each week's games in schedule order, then that week's increment. */
function expectFullReplay(actions: AnyAction[]) {
  const replay = replayActions(actions);
  const expectedTypes = season.weeks.flatMap((games) => [...games.map(() => GAME), WEEK]);
  const firstSunday = replay.findIndex((a) => a.type === SELECTION_SUNDAY);
  expect(firstSunday).toBe(expectedTypes.length);
  expect(replay.slice(0, firstSunday).map((a) => a.type)).toEqual(expectedTypes);
  expect(replay.slice(firstSunday).every((a) => a.type === SELECTION_SUNDAY)).toBe(true);
  const played = replay.filter((a) => a.type === GAME).map((a) => a.payload as GameResult);
  expect(played).toEqual(season.weeks.flat());
}

describe("PlayRegularSeasonGames", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.mocked(playGame).mockClear();
  });

  it(
    "replays the stored weeks: one addRegularSeasonGameResult per game in order, 30 addWeekPlayedToTotal, then activateSelectionSunday",
    async () => {
      vi.useFakeTimers();
      const { store, actions } = setup({ withSeason: true });

      renderWithStore(<PlayRegularSeasonGames />, store);
      // Every week's 0.5 s timer starts together: nothing before 0.5 s, everything at it.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(499);
      });
      expect(replayActions(actions)).toEqual([]);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });

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
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(replayActions(actions)).toEqual([]);
      expect(store.getState().regularSeasonRecords.weeksPlayed).toBe(0);

      await act(async () => {
        store.dispatch(regularSeasonRecordActions.setSeason(season));
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expectFullReplay(actions);
      expect(store.getState().regularSeasonRecords.weeksPlayed).toBe(30);
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
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(store.getState().regularSeasonRecords.weeksPlayed).toBe(30);
      expect(playGame).not.toHaveBeenCalled();
    },
    GAME_TEST_TIMEOUT
  );
});
