import { describe, it, expect } from "vitest";
import { storeSeason } from "@/src/utils/storeSeason";
import { compactSeason, expandSeason } from "@/src/functions/regularSeason/seasonWire";
import { simulateSeason } from "@/src/functions/regularSeason/simulateSeason";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";
import { createFastStore } from "@/tests/game/helpers/fastStore";
import { recordActions } from "@/tests/game/helpers/renderWithStore";
import { mulberry32 } from "@/tests/game/helpers/rng";
import { GAME_TEST_TIMEOUT } from "@/tests/game/helpers/timeout";

const league = buildLeague();

describe("storeSeason", () => {
  it(
    "dispatches the expanded schedule, then the season, then the field token",
    () => {
      const wire = compactSeason(simulateSeason(league.teamStats, mulberry32(1)));
      const result = { ...wire, yearId: "y", fieldToken: "test-token" };
      const { middleware, actions } = recordActions();
      const store = createFastStore({ extraMiddleware: [middleware] });
      configureStoreForLeague(store, league);
      actions.length = 0;

      storeSeason(store.dispatch, result, league.teamStats);

      const expanded = expandSeason(wire, league.teamStats);
      expect(actions.map((a) => a.type)).toEqual([
        "teamSchedule/setSeasonSchedule",
        "regularSeasonRecords/setSeason",
        "tournament/setFieldToken",
      ]);
      expect(actions[0].payload).toEqual(expanded.schedule);
      const state = store.getState();
      expect(state.regularSeasonRecords.season).toEqual({
        weeks: expanded.weeks,
        selection: wire.selection,
      });
      expect(state.tournament.fieldToken).toBe("test-token");
      // records stay untouched until the replay
      expect(Object.values(state.regularSeasonRecords.records).every((r) => r.wins === 0)).toBe(
        true
      );
    },
    GAME_TEST_TIMEOUT
  );

  it("dispatches nothing when a team is missing from the team stats", () => {
    const wire = compactSeason(simulateSeason(league.teamStats, mulberry32(1)));
    const result = { ...wire, yearId: "y", fieldToken: "test-token" };
    const { middleware, actions } = recordActions();
    const store = createFastStore({ extraMiddleware: [middleware] });
    const [firstConference, ...rest] = Object.keys(league.teamStats);
    const partial = Object.fromEntries(rest.map((c) => [c, league.teamStats[c]]));
    expect(firstConference).toBeDefined();

    expect(() => storeSeason(store.dispatch, result, partial)).toThrow(
      "A team in the season is missing from the team stats"
    );
    expect(actions).toEqual([]);
  });
});
