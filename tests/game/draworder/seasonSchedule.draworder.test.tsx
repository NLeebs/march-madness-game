import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { SeasonSchedule } from "@/src/components/RegularSeason/SeasonSchedule";
import { createFastStore } from "../helpers/fastStore";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";
import { renderWithStore } from "../helpers/renderWithStore";
import { seedMathRandom } from "../helpers/rng";
import { GAME_TEST_TIMEOUT } from "../helpers/timeout";

describe("SeasonSchedule draw order", () => {
  afterEach(() => cleanup());

  it("pins the full schedule and Math.random draw count for seed 1", () => {
    const league = buildLeague();
    const store = createFastStore();
    configureStoreForLeague(store, league);
    const seeded = seedMathRandom(1);
    let draws = 0;
    try {
      renderWithStore(
        <SeasonSchedule
          teamStats={league.teamStats}
          teamArray={store.getState().teamSchedule.teamArray}
        />,
        store,
      );
      draws = seeded.calls();
    } finally {
      seeded.restore();
    }
    const schedule = Object.fromEntries(
      Object.entries(store.getState().teamSchedule.teamSchedules).map(
        ([week, games]) => [week, games.map(([a, b]) => `${a.team}-${b.team}`)],
      ),
    );
    expect({ schedule, draws }).toMatchSnapshot();
  }, GAME_TEST_TIMEOUT);
});
