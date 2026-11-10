import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { createFastStore } from "./helpers/fastStore";
import { seedMathRandom } from "./helpers/rng";
import { playSeason, rpiByTeam } from "./helpers/runGame";
import { measureSeason } from "./helpers/stats";
import { buildLeague, configureStoreForLeague } from "@/tests/factories";
import { GAME_TEST_TIMEOUT } from "./helpers/timeout";

/*
 * Expected values were measured on 2026-11-10 against the unchanged season code:
 * fixture buildLeague() (360 teams, RPI ranks 1..360), one full season per seed,
 * Math.random seeded with mulberry32(seed). Each value is the mean of seeds [11, 22, 33].
 * meanWins is structural (every game has one winner and one loser, 30 games per team), so
 * it is exact. The spread across 8 seeds (11, 22, 33, 44, 55, 66, 77, 88) was
 * sdWins: mean 7.967, sd 0.077; rank/wins correlation: mean -0.926, sd 0.0057.
 * The expected value is a 3-seed mean, so combined SE ~ 1.15 x the single-seed sd
 * (0.089 and 0.0066). Tolerances are ~3.5+ combined SE, rounded up, so reseeding or
 * reordering draws essentially never fails while a real gameplay change does.
 */
const EXPECTED = { meanWins: 15, sdWins: 7.9576, rankWinsCorrelation: -0.9279 };
const TOLERANCE = { meanWins: 1e-9, sdWins: 0.35, rankWinsCorrelation: 0.03 };
const SEEDS = [11, 22, 33];

describe("regular season statistics", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it.each(SEEDS)("seed %i matches the expected win distribution", async (seed) => {
    const league = buildLeague();
    const store = createFastStore();
    configureStoreForLeague(store, league);
    const seeded = seedMathRandom(seed);
    try {
      await playSeason(store, league);
    } finally {
      seeded.restore();
    }
    const rpi = rpiByTeam(league);
    const m = measureSeason(
      Object.entries(store.getState().regularSeasonRecords.records).map(([team, r]) => ({
        rpi: rpi[team],
        wins: r.wins,
      })),
    );
    const near = (actual: number, expected: number, tol: number) =>
      expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
    near(m.meanWins, EXPECTED.meanWins, TOLERANCE.meanWins);
    near(m.sdWins, EXPECTED.sdWins, TOLERANCE.sdWins);
    near(m.rankWinsCorrelation, EXPECTED.rankWinsCorrelation, TOLERANCE.rankWinsCorrelation);
    expect(m.rankWinsCorrelation).toBeLessThan(-0.8);
  }, GAME_TEST_TIMEOUT);
});
