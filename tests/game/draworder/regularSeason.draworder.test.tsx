import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { createFastStore } from "../helpers/fastStore";
import { seedMathRandom } from "../helpers/rng";
import { playSeason } from "../helpers/runGame";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";

describe("regular season draw order", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("pins the final records and Math.random draw count for seed 1", async () => {
    const league = buildLeague();
    const store = createFastStore();
    configureStoreForLeague(store, league);
    const seeded = seedMathRandom(1);
    let draws = 0;
    try {
      await playSeason(store, league);
      draws = seeded.calls();
    } finally {
      seeded.restore();
    }
    const records = Object.fromEntries(
      Object.entries(store.getState().regularSeasonRecords.records).map(([team, r]) => [
        team,
        `${r.wins}-${r.losses} ${r.tournamentSelectionScore}`,
      ]),
    );
    expect({ records, draws }).toMatchSnapshot();
  }, 30000);
});
