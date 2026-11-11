/**
 * Upper bounds for each phase of a game, in ms. A phase that exceeds its bound fails with a
 * message naming the phase, long before the test's own timeout.
 *
 * Measured 2026-11-11 on the dev laptop (Windows 11, Chromium, 6 games in parallel, so a loaded
 * run), slowest of 9 phase samples per phase: toSeason 20.7 s, season 18.5 s, toSelection 1.0 s,
 * picks 24.7 s (initial measurement; see below for the re-measure), tournament 1.4 s, toStart 2.3 s. The season sim runs partly before and partly after the
 * regular season screen shows, so toSeason and season share the larger bound (2.5 x 20.7 s).
 * The sub-3 s phases get a 15 s floor, since 2.5x of ~1 s would flake under CI load.
 *
 * Picks re-measured 2026-11-11, same machine (14 cores), `npx playwright test --repeat-each 3`
 * (about 3x as many games in parallel, all cores busy): 41.5-51.3 s, and the 62 s bound failed 3 of
 * 66 runs. Picks is a stall detector (each click has its own 15 s limit), so it is now 150 s, about 3x
 * the heaviest load seen.
 */
export const PHASE_TIMEOUTS = {
  /** Start click -> regular season on screen. */
  toSeason: 52_000,
  /** Regular season sim -> "Go to Tournament" button. */
  season: 52_000,
  /** "Go to Tournament" click -> round-1 bracket column. */
  toSelection: 15_000,
  /** Whole of makePicks (63 clicks; measured 24.7 s at 6 games, 51 s under heavy load). */
  picks: 150_000,
  /** Submit Picks click -> "See Recap" button. */
  tournament: 15_000,
  /** "Play Again" click -> start screen. */
  toStart: 15_000,
};

/** Per-action limit (clicks, reads) while driving the game. */
export const PICK_ACTION_TIMEOUT_MS = 15_000;

/** Every phase of one game at its limit, plus the pick-making action budget. */
export const GAME_BUDGET_MS =
  Object.values(PHASE_TIMEOUTS).reduce((sum, ms) => sum + ms, 0) + 70 * PICK_ACTION_TIMEOUT_MS;
