import { describe, it, expect, afterEach, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";
import { regularSeasonRecordActions } from "@/store";
import { createFastStore } from "./helpers/fastStore";
import { recordActions } from "./helpers/renderWithStore";
import { seedMathRandom } from "./helpers/rng";
import { playSeason } from "./helpers/runGame";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";
import type { GameResult } from "@/types";

const result = (over: Partial<GameResult>): GameResult => ({
  favoredTeam: "fav",
  underdogTeam: "dog",
  favoredScore: 70,
  underdogScore: 60,
  favoredRPI: 10,
  underdogRPI: 200,
  ...over,
});

function storeWithTwoTeams() {
  const store = createFastStore();
  store.dispatch(
    regularSeasonRecordActions.regularSeasonRecordConfig({
      c: { fav: {}, dog: {} },
    } as never),
  );
  return store;
}

describe("regularSeasonRecords reducers", () => {
  it("favored win: updates records and adds 360 - underdogRPI + 75 to the winner", () => {
    const store = storeWithTwoTeams();
    store.dispatch(regularSeasonRecordActions.addRegularSeasonGameResult(result({})));
    const { records } = store.getState().regularSeasonRecords;
    expect(records.fav).toEqual({ wins: 1, losses: 0, tournamentSelectionScore: 360 - 200 + 75 });
    expect(records.dog).toEqual({ wins: 0, losses: 1, tournamentSelectionScore: 0 });
  });

  it("underdog win: adds 360 - favoredRPI + 75 to the winner", () => {
    const store = storeWithTwoTeams();
    store.dispatch(
      regularSeasonRecordActions.addRegularSeasonGameResult(
        result({ favoredScore: 55, underdogScore: 61 }),
      ),
    );
    const { records } = store.getState().regularSeasonRecords;
    expect(records.dog).toEqual({ wins: 1, losses: 0, tournamentSelectionScore: 360 - 10 + 75 });
    expect(records.fav).toEqual({ wins: 0, losses: 1, tournamentSelectionScore: 0 });
  });

  it("addWeekPlayedToTotal increments weeksPlayed", () => {
    const store = storeWithTwoTeams();
    store.dispatch(regularSeasonRecordActions.addWeekPlayedToTotal());
    store.dispatch(regularSeasonRecordActions.addWeekPlayedToTotal());
    expect(store.getState().regularSeasonRecords.weeksPlayed).toBe(2);
  });

  it("addConferenceChampion sets confChampion: true on that team only", () => {
    const store = storeWithTwoTeams();
    store.dispatch(regularSeasonRecordActions.addConferenceChampion({ confChampion: "dog" }));
    const { records } = store.getState().regularSeasonRecords;
    expect(records.dog.confChampion).toBe(true);
    expect(records.fav.confChampion).toBeUndefined();
  });
});

describe("PlayRegularSeasonGames season invariants", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  // Seeds 1..3 rather than 1..5: each full 360-team season costs ~3 s, and tests/game must stay under 20 s.
  it.each([1, 2, 3])("seed %i: a consistent, complete season is played", async (seed) => {
    const league = buildLeague();
    const { middleware, actions } = recordActions();
    const store = createFastStore({ extraMiddleware: [middleware] });
    configureStoreForLeague(store, league);
    const seeded = seedMathRandom(seed);
    try {
      await playSeason(store, league);
    } finally {
      seeded.restore();
    }
    const countOf = (type: string) => actions.filter((a) => a.type === type).length;
    const gamesType = regularSeasonRecordActions.addRegularSeasonGameResult.type;
    const weeksType = regularSeasonRecordActions.addWeekPlayedToTotal.type;
    const gamesDispatched = countOf(gamesType);
    const weeksDispatched = countOf(weeksType);

    // current behaviour: setSeasonPlayed(true) sits inside the per-week loop (it runs
    // after the first week resolves), all 30 week timers are started together on mount,
    // and the effect only starts a season while weeksPlayed === 0. Once the season is
    // done, letting more time pass and the effect re-run replays nothing.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(countOf(gamesType)).toBe(gamesDispatched);
    expect(countOf(weeksType)).toBe(weeksDispatched);
    expect(weeksDispatched).toBe(30);

    const state = store.getState();
    expect(state.regularSeasonRecords.weeksPlayed).toBe(30);
    expect(state.appState.selectionSunday).toBe(true);

    const scheduled: Record<string, number> = {};
    let totalGames = 0;
    for (const games of Object.values(state.teamSchedule.teamSchedules)) {
      for (const [a, b] of games) {
        scheduled[a.team] = (scheduled[a.team] ?? 0) + 1;
        scheduled[b.team] = (scheduled[b.team] ?? 0) + 1;
        totalGames++;
      }
    }

    const results = actions
      .filter((a) => a.type === gamesType)
      .map((a) => a.payload as GameResult);
    expect(results).toHaveLength(totalGames);

    const expectedScore: Record<string, number> = {};
    for (const r of results) {
      const favWon = r.favoredScore > r.underdogScore;
      const winner = favWon ? r.favoredTeam : r.underdogTeam;
      const loserRPI = favWon ? r.underdogRPI : r.favoredRPI;
      expectedScore[winner] = (expectedScore[winner] ?? 0) + (360 - loserRPI + 75);
    }

    let wins = 0;
    let losses = 0;
    const { records } = state.regularSeasonRecords;
    expect(Object.keys(records)).toHaveLength(360);
    for (const [team, rec] of Object.entries(records)) {
      expect(rec.wins + rec.losses).toBe(scheduled[team]);
      expect(rec.tournamentSelectionScore).toBe(expectedScore[team] ?? 0);
      wins += rec.wins;
      losses += rec.losses;
    }
    expect(wins).toBe(totalGames);
    expect(losses).toBe(totalGames);
  }, 30000);
});
