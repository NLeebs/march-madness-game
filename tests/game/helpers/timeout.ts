/**
 * Explicit timeout (ms) for heavy tests in tests/game (360-team schedules,
 * full seasons, stats runs, tournament drivers). Vitest's 5 s default can be
 * exceeded under load even though these tests take 1-8 s on an idle machine.
 */
export const GAME_TEST_TIMEOUT = 60_000;
