import { describe, it, expect } from "vitest";
import { playGame } from "@/src/functions";
import { TeamStats } from "@/models";
import { buildLeague } from "@/tests/factories";
import { mulberry32 } from "./helpers/rng";
import { measureGames, outOfTolerance, GameSample, GameMetrics } from "./helpers/stats";
import { GAME_TEST_TIMEOUT } from "./helpers/timeout";

/*
 * Expected values were measured on 2026-11-10 against the unchanged playGame:
 * seeds [11, 22, 33], 30,000 games per seed, fixture buildLeague() (360 teams, RPI 1..360),
 * pairs drawn uniformly from the whole league with a separate mulberry32(seed + 1000)
 * stream (so pair choice does not depend on playGame's draw count); playGame gets
 * rng = mulberry32(seed) (passed directly: a Math.random spy over ~10M draws is slow).
 * Each value is the mean of the 3 per-seed results. The gap bands are in RPI ranks.
 *
 * Tolerances are 4 combined standard errors per metric. The single-seed SE was measured
 * as the spread of 120 independent 30,000-game runs (fresh pairs and fresh game stream);
 * a new run compared with a 3-seed mean has SE about 1.15x that (sqrt(1 + 1/3)).
 * Checked against 300 simulated draw reorders (same pairs, fresh game stream per seed):
 * 0 failures, largest deviation 0.84 of its tolerance. A real gameplay change shifts the
 * score means by several SE and fails (e.g. +0.02 three-point % or +0.01 forced-turnover %
 * on every team fails every time); changes of a few SE or less may pass.
 */
const EXPECTED: GameMetrics = {
  favoredWinRate: 0.8458,
  favoredWinRateByGap: { small: 0.6557, medium: 0.7934, large: 0.9585 },
  meanWinningScore: 72.1591,
  sdWinningScore: 11.6523,
  meanLosingScore: 50.9267,
  sdLosingScore: 11.7373,
  meanMargin: 21.2324,
  sdMargin: 14.7803,
  oneScoreMarginRate: 0.0415,
};

const TOLERANCE: GameMetrics = {
  favoredWinRate: 0.009,
  favoredWinRateByGap: { small: 0.032, medium: 0.0165, large: 0.0085 },
  meanWinningScore: 0.29,
  sdWinningScore: 0.21,
  meanLosingScore: 0.32,
  sdLosingScore: 0.23,
  meanMargin: 0.39,
  sdMargin: 0.32,
  oneScoreMarginRate: 0.0056,
};

const SEEDS = [11, 22, 33];
const GAMES_PER_SEED = 30000;

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
  const rng = mulberry32(seed);
  const samples: GameSample[] = pairs.map(([a, b]) => ({
    result: playGame(a, b, rng),
    rpiGap: Math.abs(+a.rpi - +b.rpi),
  }));
  return measureGames(samples);
}

describe("playGame statistics", () => {
  it.each(SEEDS)("seed %i matches the expected distribution", (seed) => {
    const failures = outOfTolerance(simulate(seed), EXPECTED, TOLERANCE);
    expect(failures, `out of tolerance for seed ${seed}:\n${failures.join("\n")}`).toEqual([]);
  }, GAME_TEST_TIMEOUT);
});
