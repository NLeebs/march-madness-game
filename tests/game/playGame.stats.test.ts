import { describe, it, expect } from "vitest";
import { playGame } from "@/src/functions";
import { TeamStats } from "@/models";
import { buildLeague } from "@/tests/factories";
import { mulberry32, seedMathRandom } from "./helpers/rng";
import { measureGames, GameSample, GameMetrics } from "./helpers/stats";

/*
 * Expected values were measured on 2026-11-10 against the unchanged playGame:
 * seeds [11, 22, 33], 3000 games per seed, fixture buildLeague() (360 teams, RPI 1..360),
 * pairs drawn uniformly from the whole league with a separate mulberry32(seed + 1000)
 * stream (so pair choice does not depend on playGame's draw count); Math.random is
 * seeded with mulberry32(seed). Each value is the mean of the 3 per-seed results.
 * The gap bands are in RPI ranks. Tolerances are at least ~3x the observed cross-seed
 * deviation and about 3+ standard errors of a single seed, so a different draw order
 * passes while a real gameplay change fails.
 */
const EXPECTED: GameMetrics = {
  favoredWinRate: 0.8457,
  favoredWinRateByGap: { small: 0.648, medium: 0.7918, large: 0.9593 },
  meanWinningScore: 72.3191,
  sdWinningScore: 11.6666,
  meanLosingScore: 50.8289,
  sdLosingScore: 11.6839,
  meanMargin: 21.4902,
  sdMargin: 14.7727,
  oneScoreMarginRate: 0.0371,
};

const TOLERANCE = {
  rate: 0.02,
  oneScoreMarginRate: 0.015,
  gap: { small: 0.08, medium: 0.04, large: 0.02 },
  points: 0.75,
};

const SEEDS = [11, 22, 33];
const GAMES_PER_SEED = 3000;

const allTeams = (): TeamStats[] =>
  Object.values(buildLeague().teamStats).flatMap((conf) => Object.values(conf));

function simulate(seed: number) {
  const teams = allTeams();
  const pick = mulberry32(seed + 1000);
  const pairs = Array.from({ length: GAMES_PER_SEED }, () => {
    const i = Math.floor(pick() * teams.length);
    let j = Math.floor(pick() * teams.length);
    if (j === i) j = (j + 1) % teams.length;
    return [teams[i], teams[j]] as const;
  });
  const seeded = seedMathRandom(seed);
  try {
    const samples: GameSample[] = pairs.map(([a, b]) => ({
      result: playGame(a, b),
      rpiGap: Math.abs(+a.rpi - +b.rpi),
    }));
    return measureGames(samples);
  } finally {
    seeded.restore();
  }
}

describe("playGame statistics", () => {
  it.each(SEEDS)("seed %i matches the expected distribution", (seed) => {
    const m = simulate(seed);
    const near = (actual: number, expected: number, tol: number) =>
      expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);

    near(m.favoredWinRate, EXPECTED.favoredWinRate, TOLERANCE.rate);
    near(m.favoredWinRateByGap.small, EXPECTED.favoredWinRateByGap.small, TOLERANCE.gap.small);
    near(m.favoredWinRateByGap.medium, EXPECTED.favoredWinRateByGap.medium, TOLERANCE.gap.medium);
    near(m.favoredWinRateByGap.large, EXPECTED.favoredWinRateByGap.large, TOLERANCE.gap.large);
    near(m.meanWinningScore, EXPECTED.meanWinningScore, TOLERANCE.points);
    near(m.sdWinningScore, EXPECTED.sdWinningScore, TOLERANCE.points);
    near(m.meanLosingScore, EXPECTED.meanLosingScore, TOLERANCE.points);
    near(m.sdLosingScore, EXPECTED.sdLosingScore, TOLERANCE.points);
    near(m.meanMargin, EXPECTED.meanMargin, TOLERANCE.points);
    near(m.sdMargin, EXPECTED.sdMargin, TOLERANCE.points);
    near(m.oneScoreMarginRate, EXPECTED.oneScoreMarginRate, TOLERANCE.oneScoreMarginRate);
  });
});
