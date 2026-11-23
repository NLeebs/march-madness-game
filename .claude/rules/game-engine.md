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

Steps 1-3 and 6 of the game loop run on the server and the browser replays them; steps 4-5 run in the browser (the server re-seeds from the field token to validate picks). Steps 1-3 run in `simulateSeason` (`POST /api/season`), which also signs the field token; `PlayRegularSeasonGames` and `SelectionSunday` replay `regularSeasonRecords.season` (the `SeasonSchedule` component is gone):
1. schedule (`createSeasonSchedule`);
2. regular season (`playGame`);
3. Selection Sunday (`selectTournamentField`);
4. seeding and bracket (`src/functions/tournament/`, stored by `tournamentSlice`);
5. picks (`applyPick`, stored by `tournamentPlayersPicksSlice`);
6. the tournament: `simulateTournament` (`src/functions/tournament/`) plays and scores it on the server (`POST /api/bracket/simulation`); the drivers (`PlayPlayinGames`, `PlayTournamentGames`) only replay `tournament.simulation` and dispatch the stored results. They pass the server's `roundPoints` to `recordRoundScore`'s optional `points` argument; without it the reducer uses `scoreRound`'s points.

Every part of it is under characterization tests in `tests/game/`. Preserve gameplay unless a change is a deliberate gameplay change. Results (`applyGameResult`) and picks (`getNextRoundInfo`) place a winner in the same next-round slot: `ROUND_CONFIG[round].advance[region].teamIndex` when the region changes, else `gameIndex % 2`. Slots don't depend on dispatch order. The drivers draw no random numbers (since step 9a-2 they only replay `tournament.simulation`); `PlayTournamentGames` replays one round per run of a single effect, choosing it with `getReplayRound`, and `tests/game/tournamentDrivers.test.tsx` pins the whole replay's action sequence. Play-in placeholder regions (seeding, `applyPlayinResult`) all come from `PLAYIN_ROUND_ONE_SLOTS`. The pure tournament functions are also unit-tested in `tests/unit/functions/tournament/` with deep-frozen inputs.

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
| Statistical checks: favored win rate (overall and by RPI gap), score means and spreads, one-point-game rate, season win spread, rank/wins correlation. Seeded, so never flaky. `playGame` checks use 30,000 games per seed with tolerances of ~4 standard errors; 300 simulated draw reorders produced no failures. Small real changes (e.g. +0.03 free-throw %) are only partly caught. | `tests/game/*.stats.test.ts(x)`, helpers in `tests/game/helpers/stats.ts` | Only with a deliberate gameplay change. Re-measure using the comment block at the top of each file (date, seeds, sample size, fixture, how pairs are drawn). |
| Draw-order pins: exact results that depend on the order of random draws (`playGame` outputs, schedule, season records, a full seeded game) plus draw counts. | `tests/game/draworder/` + `__snapshots__/` | Regenerated on purpose only (below). |

Separately, the bracket UI has a render pin: `tests/unit/components/Tournament/bracketRender.test.tsx` snapshots every bracket column's test id, classes and framer-motion `animate` targets, in DOM order, for `Tournament` and `RoundSelectBanner` across the breakpoint edges, selected rounds and phases. framer-motion is mocked there so `animate` shows in the DOM. The layout ladders live as pure functions in `src/functions/tournament/layout/` (`getRoundLayout`, `getRoundSpacing`, `getRoundButtonState`, `ROUND_STATE_KEYS`), unit-tested in `tests/unit/functions/tournament/layout/`. Update the render snapshot (`npx vitest run tests/unit/components/Tournament -u`) only for an intended visual change, in its own commit, and say which entries moved in the PR.

## Regenerating draw-order pins

Changing the order or number of random draws without changing the game (e.g. moving the tournament driver out of components) is allowed. The `fullRun` pin was regenerated once in step 9a-2 because play-in results now carry scores. When you do it:

1. Make the draw-order change in a commit that changes nothing else.
2. In that commit, the fixed-contract tests and statistical checks must pass **unchanged**. If a statistical check fails, the gameplay changed, not just the draw order.
3. Regenerate with `npx vitest run -u tests/game/draworder`. Never run `-u` on any other path.
4. Say in the PR that the draw order changed and why.

## Helpers and fixture

- `tests/factories/league.factory.ts`:
  - `buildLeague()` builds a deterministic 360-team league with 31 conferences (hard-coded, matching real data; don't derive it from the legacy scraping config), rank-string RPI 1..360 and quality-skewed stats;
  - `configureStoreForLeague(store, league)` dispatches the same setup as `StartScreen`.
- `store/store.ts` `createAppStore({ preloadedState, extraMiddleware, devChecks })` gives a fresh store per test.
  - `tests/game/helpers/fastStore.ts` `createFastStore()` turns off Redux Toolkit's dev checks, which walk the whole state on every dispatch and make full-game tests slow. The season replays one `addRegularSeasonWeekResults` per week.
  - `recordActions()` (in `renderWithStore.tsx`) captures dispatched actions. Use it instead of `vi.spyOn` on barrel exports, which doesn't intercept component imports.
- `tests/game/helpers/runGame.ts`:
  - `playSeason` runs `simulateSeason`, stores it with `storeSeason`, then replays it under fake timers (one week every 0.15 s);
  - `buildRecords`;
  - `pickChalk` uses `getNextRoundInfo`, exported from `TournamentMatchup.tsx`;
  - `playTournament` calls `simulateTournament` (as the server does), stores the result in `tournament.simulation`, then mounts `TournamentReplay`, the same component `App.tsx` uses to mount the drivers.
- `tests/game/helpers/fullRun.ts` `playFullGame(seed)` runs one seeded stream from schedule to champion (`simulateSeason` + `storeSeason`, then the tournament).
- Heavy tests (360-team schedules, seasons, tournaments) pass `GAME_TEST_TIMEOUT` (`tests/game/helpers/timeout.ts`). Vitest's 5 s default fails under load. `npx vitest run tests/game` should stay under about 40 s.

## Known oddities pinned as current behaviour

Search `tests/game` for `// current behaviour:`. They are logged in `docs/DIAGNOSIS.md` (findings 33-38). Fix them only as their own change, updating the pinning test in the same PR.
