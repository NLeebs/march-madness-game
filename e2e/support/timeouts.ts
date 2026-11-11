/**
 * Upper bounds for each phase of a game, in ms. A phase that exceeds its bound fails with a
 * message naming the phase, long before the test's own timeout.
 *
 * Measured 2026-11-11 on the dev laptop (Windows 11, Chromium, 6 games in parallel, so a loaded
 * run), slowest of 9 phase samples per phase: toSeason 20.7 s, season 18.5 s, toSelection 1.0 s,
 * tournament 1.4 s, toStart 2.3 s. The season sim runs partly before and partly after the
 * regular season screen shows, so toSeason and season share the larger bound (2.5 x 20.7 s).
 * The sub-3 s phases get a 15 s floor, since 2.5x of ~1 s would flake under CI load.
 */
export const PHASE_TIMEOUTS = {
  /** Start click -> regular season on screen. */
  toSeason: 52_000,
  /** Regular season sim -> "Go to Tournament" button. */
  season: 52_000,
  /** "Go to Tournament" click -> round-1 bracket column. */
  toSelection: 15_000,
  /** Submit Picks click -> "See Recap" button. */
  tournament: 15_000,
  /** "Play Again" click -> start screen. */
  toStart: 15_000,
};

/** Per-action limit (clicks, reads) while driving the game. */
export const PICK_ACTION_TIMEOUT_MS = 15_000;
