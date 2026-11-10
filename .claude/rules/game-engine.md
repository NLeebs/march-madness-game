---
paths:
  - "src/functions/**"
  - "store/**"
  - "src/components/RegularSeason/**"
  - "src/components/Tournament/**"
  - "tests/factories/league*"
  - "tests/game/**"
---
# Game engine (simulation, selection, bracket, scoring)

The game loop runs entirely in the browser:
1. schedule (`createSeasonSchedule`);
2. regular season (`PlayRegularSeasonGames` → `playGame`);
3. Selection Sunday (`selectTournamentField`);
4. seeding and bracket (`tournamentSlice`);
5. picks (`tournamentPlayersPicksSlice`);
6. the tournament drivers (`PlayPlayinGames`, `PlayTournamentGames`).

Every part of it is under characterization tests in `tests/game/`. Preserve gameplay unless a change is a deliberate gameplay change.

## Randomness

- `playGame(team1, team2, rng = Math.random)` and `createSeasonSchedule(teamStats, teamArray, rng = Math.random)` take an optional random source. The app passes nothing, so it uses `Math.random`.
- Tests seed with `tests/game/helpers/rng.ts`:
  - `mulberry32(seed)` is a seeded generator to pass as `rng`;
  - `seedMathRandom(seed)` stubs `Math.random` and counts draws. It is used where components call the engine. Always `restore()` it, in a `finally` or `afterEach`.
- Never put unseeded randomness behind an exact assertion.

## The three kinds of tests

| Kind | Where | Changes when |
|---|---|---|
| Fixed contract: schedule rules, record-keeping, selection, seeding, pairings, advancement, picks cascade, scoring. Explicit expected values from hand-built inputs, never snapshots. | `tests/game/*.test.ts(x)`, `tests/unit/functions/*` | Only with a deliberate gameplay change, called out in the PR. |
| Statistical checks: favored win rate (overall and by RPI gap), score means and spreads, one-point-game rate, season win spread, rank/wins correlation. Seeded, so never flaky; tolerances ~3-4 standard errors. | `tests/game/*.stats.test.ts(x)`, helpers in `tests/game/helpers/stats.ts` | Only with a deliberate gameplay change. Re-measure using the comment block at the top of each file (date, seeds, sample size, fixture, how pairs are drawn). |
| Draw-order pins: exact results that depend on the order of random draws (`playGame` outputs, schedule, season records, a full seeded game) plus draw counts. | `tests/game/draworder/` + `__snapshots__/` | Regenerated on purpose only (below). |

## Regenerating draw-order pins

Changing the order or number of random draws without changing the game (e.g. collapsing `playGame`'s favored/underdog code, or moving the tournament driver out of components) is allowed. When you do it:

1. Make the draw-order change in a commit that changes nothing else.
2. In that commit, the fixed-contract tests and statistical checks must pass **unchanged**. If a statistical check fails, the gameplay changed, not just the draw order.
3. Regenerate with `npx vitest run -u tests/game/draworder`. Never run `-u` on any other path.
4. Say in the PR that the draw order changed and why.

## Helpers and fixture

- `tests/factories/league.factory.ts`:
  - `buildLeague()` builds a deterministic 360-team league with `numberOfConferences` conferences, rank-string RPI 1..360 and quality-skewed stats;
  - `configureStoreForLeague(store, league)` dispatches the same setup as `StartScreen`.
- `store/store.ts` `createAppStore({ preloadedState, extraMiddleware, devChecks })` gives a fresh store per test.
  - `tests/game/helpers/fastStore.ts` `createFastStore()` turns off Redux Toolkit's dev checks, which make 5,400-dispatch seasons very slow.
  - `recordActions()` (in `renderWithStore.tsx`) captures dispatched actions. Use it instead of `vi.spyOn` on barrel exports, which doesn't intercept component imports.
- `tests/game/helpers/runGame.ts`:
  - `playSeason` uses fake timers for `delay`;
  - `buildRecords`;
  - `pickChalk` mirrors `TournamentMatchup`'s next-round mapping;
  - `playTournament` mounts the drivers under `App.tsx`'s conditions.
- `tests/game/helpers/fullRun.ts` `playFullGame(seed)` runs one seeded stream from schedule to champion.
- Heavy tests (360-team schedules, seasons, tournaments) pass `GAME_TEST_TIMEOUT` (`tests/game/helpers/timeout.ts`). Vitest's 5 s default fails under load. `npx vitest run tests/game` should stay under about 40 s.

## Known oddities pinned as current behaviour

Search `tests/game` for `// current behaviour:`. They are logged in `docs/DIAGNOSIS.md` (findings 33-38). Fix them only as their own change, updating the pinning test in the same PR.
