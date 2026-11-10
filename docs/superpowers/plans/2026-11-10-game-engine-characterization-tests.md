# Game Engine Characterization Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a safety net of invariants, statistical checks and exact pins under the whole game loop (schedule, season, `playGame`, Selection Sunday, seeding, tournament, picks/scoring). Then make `playGame` seedable and move schedule and selection logic out of components, without changing gameplay.

**Architecture:** Phase 1 tests today's code as-is, against a real Redux store and a seeded `Math.random`, on a 360-team synthetic league. Phase 2 adds an optional `rng` to `playGame`. Phase 3 extracts `createSeasonSchedule` and `selectTournamentField` into `src/functions/regularSeason/`. Phase-1 test files stay unedited through phases 2-3, which proves behaviour is preserved. Tests come in three kinds:
- fixed-contract tests, with explicit expectations;
- statistical checks, measured from today's code;
- draw-order pins (snapshots in `tests/game/draworder/`, regenerable on purpose).

**Tech Stack:** TypeScript, Redux Toolkit, React 18, vitest (jsdom, fake timers), @testing-library/react, react-redux `Provider`.

**Spec:** `docs/superpowers/specs/2026-11-10-game-engine-characterization-tests-design.md`

## Global Constraints

- No change in gameplay: results, distribution, selection, seeding, scoring, phase order or timing. With the default `rng`, the sequence and count of random draws must be identical to today's.
- Phase-1 test files (Tasks 2-10) are **not modified** in the phase-2/3 commits (Tasks 11-13). If one seems to need a change, stop and report it; don't edit it.
- No draw-order pin is regenerated in this step (no `-u` after a pin is first written).
- Simulation randomness in tests comes only from the seeded generator in `tests/game/helpers/rng.ts`. Never use real timers: use `vi.useFakeTimers()` wherever `delay` runs.
- Fixed-contract tests use explicit expectations, not snapshots. Only files under `tests/game/draworder/` use `toMatchSnapshot`.
- No new `any` in new code; type as if `strict` were on (`strict: false` stays). No new dependencies.
- Known bugs and oddities are pinned as they behave today, with a `// current behaviour:` comment, and listed for `docs/DIAGNOSIS.md` in the task report. Do not fix them.
- The new suite adds seconds, not minutes: the whole `tests/game/` directory must run in under 20 s with `npx vitest run tests/game`.
- Conventional commits (`test:`, `refactor:`, `docs:`). Use `npx vitest` / `npx tsc` only after `npm ci`.
- Export new modules from the barrel `index.ts` files.

## Review Focus

1. **A league whose total team count is odd.** One team sits out a conference week. Expectation: today's behaviour (the leftover team gets no game that week) is pinned, and nothing crashes. Test added in Task 4.
2. **A conference title tie.** Covers a two-way tie at the top, a three-way tie, and an all-tied conference. Today's code compares sorted[0] with sorted[1] and then tie-breaks by selection score. Expectation: the champion is the tied team with the highest score. Test added in Task 6.
3. **Two teams with equal RPI in `playGame`.** Expectation: `team1` is favored, because the swap uses a strict `>`. Test added in Task 2.
4. **A player who picked a play-in placeholder deep into the bracket.** Expectation: `replacePlayinPicksWithWinner` replaces the placeholder in every round and region. Test added in Task 8.
5. **Selection-score ties at the at-large cutoff and the play-in boundary.** Expectation: ties resolve by today's stable sort over `Object.keys(records)` order. Test added in Task 6.

## File structure

| File | Responsibility |
|---|---|
| `store/store.ts` (modify) | add `createAppStore(options?)`; default `store = createAppStore()` |
| `tests/game/helpers/rng.ts` | `mulberry32`, `seedMathRandom` |
| `tests/game/helpers/renderWithStore.tsx` | render a component inside a `Provider` of a fresh store |
| `tests/game/helpers/stats.ts` | `measureGames` metrics for the statistical checks |
| `tests/game/helpers/runGame.ts` | drives the phases on a store (used by Tasks 9-10) |
| `tests/factories/league.factory.ts` | `buildLeague()`, the 360-team fixture |
| `tests/game/*.test.ts(x)` | fixed-contract tests and invariants |
| `tests/game/*.stats.test.ts` | statistical checks |
| `tests/game/draworder/*.draworder.test.ts(x)` + `__snapshots__/` | draw-order pins |
| `src/functions/regularSeason/createSeasonSchedule.ts` | phase-3 schedule extraction |
| `src/functions/regularSeason/selectTournamentField.ts` | phase-3 selection extraction |
| `.claude/rules/game-engine.md`, `CLAUDE.md`, `docs/DIAGNOSIS.md` | docs (Task 14) |

---

### Task 1: Test infrastructure and league fixture

**Files:**
- Modify: `store/store.ts`
- Create: `tests/game/helpers/rng.ts`, `tests/game/helpers/renderWithStore.tsx`, `tests/factories/league.factory.ts`
- Modify: `tests/factories/index.ts`
- Test: `tests/game/infrastructure.test.ts`

**Interfaces:**
- Produces:
  - `createAppStore(options?: { preloadedState?: Partial<RootState>; extraMiddleware?: Middleware[] })`: `configureStore` with the same 7 reducers and the default middleware, plus `extraMiddleware` appended. `RootState` is still `ReturnType<typeof store.getState>`. Export `AppStore = ReturnType<typeof createAppStore>`.
  - `recordActions(): { middleware: Middleware; actions: UnknownAction[] }` in `tests/game/helpers/renderWithStore.tsx`, a middleware that pushes every dispatched action into `actions`. Tests use it to read the dispatch order and the game results, because a `vi.spyOn` on an ESM barrel export does not intercept the components' imports.
  - `mulberry32(seed: number): () => number`.
  - `seedMathRandom(seed: number): { calls: () => number; restore: () => void }`. It wraps `vi.spyOn(Math, "random").mockImplementation(mulberry32(seed))`, and `calls()` is the spy's call count.
  - `renderWithStore(ui: React.ReactElement, store: AppStore)`: RTL `render` wrapped in `<Provider store={store}>`.
  - `buildLeague(): League`, where `League = { teamStats: ConferenceMap; conferenceArrays: ConferenceArrays; teamArray: TeamSchedule[] }`.
  - `configureStoreForLeague(store: AppStore, league: League): void`, which dispatches, in order, exactly what `StartScreen` does: `addToStateFromDB`, `addConferenceArrays`, `teamScheduleConfig`, `regularSeasonRecordConfig`.

- [ ] **Step 1: Write the failing tests** in `tests/game/infrastructure.test.ts`:
  - `mulberry32 is deterministic`: two generators with seed 1 give equal first 10 values; all values are in [0, 1).
  - `seedMathRandom stubs and restores`: after `seedMathRandom(1)`, `Math.random()` equals `mulberry32(1)()`, and `calls()` is 1. After `restore()`, `Math.random` is the original.
  - `buildLeague shape`:
    - 360 teams;
    - `Object.keys(teamStats).length === numberOfConferences` (import from `@/src/components/Add-To-Firebase/teamStatURLUtils`);
    - `NUMBER_OF_AT_LARGE_TEAMS === 68 - numberOfConferences`;
    - at least 2 conferences with an odd team count;
    - every conference has ≥ 2 teams;
    - `rpi` values are the strings "1".."360", each used once;
    - `teamArray` order equals `teamScheduleConfig`'s order (conference key order, then team key order);
    - `buildLeague()` called twice is deep-equal.
  - `recordActions` captures actions dispatched through a store built with it, in order.
  - `configureStoreForLeague`: `teamSchedule.teamSchedules` has keys `week1`..`week30`; every record is `{wins:0, losses:0, tournamentSelectionScore:0}`.
- [ ] **Step 2: Run** `npx vitest run tests/game/infrastructure.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement.**
  - `createAppStore` in `store/store.ts`; keep the default export a singleton built with it.
  - `buildLeague`, deterministic and built from `mulberry32` with a fixed internal seed.
    - Use `numberOfConferences` conferences named `conf01`…; split 360 teams into sizes that include at least 2 odd sizes; name teams `team001`…`team360`.
    - `rpi` and `"schedule-strength"` are rank strings (1 = best), like the scraped data.
    - `possessions` is a string between 62 and 74.
    - Percentage stats are fractions in realistic ranges (shooting 0.28-0.58, rebounds 0.22-0.78, turnovers/fouls 0.12-0.24), skewed so better-ranked teams have better stats.
    - Use `buildTeamStats` from `teamStats.factory.ts` for the shape.
- [ ] **Step 4: Run** the same command. Expected: PASS. Also run `npx vitest run` (all existing tests stay green) and `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `test: add game test helpers, createAppStore and 360-team league fixture`.

### Task 2: `playGame` invariants and draw-order pins

**Files:**
- Test: `tests/game/playGame.test.ts`, `tests/game/draworder/playGame.draworder.test.ts`

**Interfaces:**
- Consumes: `buildLeague`, `seedMathRandom`, `mulberry32` (Task 1).

- [ ] **Step 1: Write the invariant tests** in `playGame.test.ts`. For seeds 1..20, run 50 games per seed between team pairs chosen by a separate `mulberry32(seed + 1000)`, with `Math.random` seeded per seed. Assert:
  - `winner score > loser score` (never equal);
  - scores are non-negative integers;
  - `favoredTeam` is the lower-`rpi` input, and `favoredRPI`/`underdogRPI` equal `+rpi`;
  - `{favoredTeam, underdogTeam}` equals the two input names.

  Also test `equal RPI: team1 is favored` with two copies of one team given different names (Review Focus 3).
- [ ] **Step 2: Write the draw-order pins** in `draworder/playGame.draworder.test.ts`. Use 5 fixed pairs: rank 1 v 360, 1 v 2, 50 v 60, 180 v 181, 300 v 10. Run each under seeds 1, 2 and 3 and `toMatchSnapshot()` the `GameResult` plus `calls()` (the draw count per game).
- [ ] **Step 3: Run** `npx vitest run tests/game/playGame.test.ts tests/game/draworder`. Expected: PASS, with the snapshot written.
- [ ] **Step 4: Prove the tests can fail.** Flip one invariant's expected value locally and see it go red, then revert. Report that you did this.
- [ ] **Step 5: Commit** `test: characterize playGame invariants and pin draw order`.

### Task 3: `playGame` statistical checks

**Files:**
- Create: `tests/game/helpers/stats.ts`
- Test: `tests/game/playGame.stats.test.ts`

**Interfaces:**
- Produces: `measureGames(results: { result: GameResult; rpiGap: number }[]): GameMetrics`, where `GameMetrics = { favoredWinRate: number; favoredWinRateByGap: { small: number; medium: number; large: number }; meanWinningScore: number; sdWinningScore: number; meanLosingScore: number; sdLosingScore: number; meanMargin: number; sdMargin: number; oneScoreMarginRate: number }`.
  - Gap bands: small < 30, medium 30-119, large ≥ 120 ranks.
  - `oneScoreMarginRate` (replacing an OT flag, which `GameResult` doesn't carry): the share of games decided by exactly 1 point. Every buzzer-beater game ends with a margin of 1, so a change in tie/overtime behaviour moves this rate. Name the field `oneScoreMarginRate` in `GameMetrics` instead of `overtimeRate`.

- [ ] **Step 1: Measure today's values.** Write the test with seeds `[11, 22, 33]`. Each seed plays 3000 games between pairs drawn from the league with that seed. Temporarily `console.table` the metrics. Run it, then record each metric's mean across the 3 seeds as the expected value.
- [ ] **Step 2: Write the assertions.**
  - Every seed must be within tolerance of the expected values: ±0.03 on rates (±0.05 per gap band), ±1.5 points on means, ±1.5 on standard deviations. Tighten these if the observed spread across seeds allows.
  - Add a comment block saying how the values were measured (date, seeds, sample size, fixture).
  - Remove the `console.table`.
- [ ] **Step 3: Prove sensitivity.** Temporarily change one `playGame` constant (e.g. `SOS_MULTIPLIER` to 1) and confirm at least one check fails, then revert. Report the result.
- [ ] **Step 4: Run** `npx vitest run tests/game/playGame.stats.test.ts`. Expected: PASS in a few seconds.
- [ ] **Step 5: Commit** `test: add statistical checks for playGame`.

### Task 4: Schedule characterization (component)

**Files:**
- Test: `tests/game/seasonSchedule.test.tsx`, `tests/game/draworder/seasonSchedule.draworder.test.tsx`

**Interfaces:**
- Consumes: `createAppStore`, `configureStoreForLeague`, `renderWithStore`, `seedMathRandom`, `buildLeague`.

- [ ] **Step 1: Write the invariant tests.** For seeds 1..20: set up a fresh store with `configureStoreForLeague`, seed `Math.random`, and render `<SeasonSchedule teamStats={league.teamStats} teamArray={state.teamSchedule.teamArray} />`. Assert on `state.teamSchedule.teamSchedules`:
  - 30 week keys.
  - Weeks 1-15: 180 games each, and every team appears exactly once.
  - Weeks 16-30: every team appears at most once, and with an even league no team is missing. Pairings are same-conference, except games between that week's leftover teams, at most one per odd-sized conference.
  - No team plays itself.
  - Total games equal the formula from the fixture's conference sizes: `15*180 + 15*(Σ floor(n/2) + floor(oddConfs/2))`.
  - The store's `teamArray` is unchanged after render (the component must not mutate store data).
- [ ] **Step 2: Odd-total league (Review Focus 1).** Build a small league of 3 conferences of sizes 3, 3 and 3 with `buildConferenceMap`. Pin today's behaviour: one team per non-conference week has no game, and leftover pairing leaves one team out. Nothing should throw.
- [ ] **Step 3: Write the draw-order pin.** For seed 1, snapshot a compact form of the full schedule (`week -> "teamA-teamB"` strings) plus the `Math.random` call count.
- [ ] **Step 4: Run** `npx vitest run tests/game/seasonSchedule.test.tsx tests/game/draworder`. Expected: PASS.
- [ ] **Step 5: Commit** `test: characterize season schedule creation`.

### Task 5: Regular season (reducers and component)

**Files:**
- Test: `tests/game/regularSeason.test.tsx`, `tests/game/regularSeason.stats.test.tsx`, `tests/game/draworder/regularSeason.draworder.test.tsx`

**Interfaces:**
- Consumes: Task 1 helpers. A schedule is created by rendering `SeasonSchedule` as in Task 4.
- Produces: `playSeason(store: AppStore, league: League): Promise<void>` in `tests/game/helpers/runGame.ts`. It renders `SeasonSchedule`, then `PlayRegularSeasonGames`, then advances fake timers until `weeksPlayed === 30` and `appState.selectionSunday` is true. Tasks 9-10 reuse it.

- [ ] **Step 1: Fixed contract (reducers).** Test `addRegularSeasonGameResult` with hand-built `GameResult`s:
  - favored win: wins/losses update, and the winner's score grows by `360 - underdogRPI + 75`;
  - underdog win: the winner's score grows by `360 - favoredRPI + 75`;
  - the loser's score is unchanged.

  Also test that `addWeekPlayedToTotal` increments `weeksPlayed`, and that `addConferenceChampion` sets `confChampion: true`.
- [ ] **Step 2: Component invariants.** For seeds 1..5, use `vi.useFakeTimers()` and `playSeason`, then assert:
  - `weeksPlayed === 30`;
  - `selectionSunday === true`;
  - per team, `wins + losses` = the number of games in the schedule (no game played twice, none skipped);
  - total wins = total losses = total games;
  - every team's selection score equals the sum of the formula over its wins. Recompute this from the `addRegularSeasonGameResult` payloads captured by `recordActions`.

  Pin the `setSeasonPlayed(true)`-inside-the-loop quirk as current behaviour: the season is not replayed when the effect re-runs.
- [ ] **Step 3: Statistical check.** Over seeds `[11, 22, 33]`, measure the mean and standard deviation of season win totals, and the correlation between rank and wins. Measure, record and assert with tolerances the same way as Task 3.
- [ ] **Step 4: Draw-order pin.** For seed 1, snapshot the final `records`.
- [ ] **Step 5: Run** `npx vitest run tests/game`. Expected: PASS.
- [ ] **Step 6: Commit** `test: characterize regular season play and records`.

### Task 6: Selection Sunday (fixed contract)

**Files:**
- Test: `tests/game/selectionSunday.test.tsx`

**Interfaces:**
- Consumes: `createAppStore({ preloadedState, extraMiddleware })`, `recordActions`, `renderWithStore`, `buildLeague`.
- Produces: `buildRecords(league, scoreFor: (team: string, index: number) => { wins: number; score: number }): Record<string, RegularSeasonTeam>` in `tests/game/helpers/runGame.ts`, for hand-built seasons.

- [ ] **Step 1: Write the tests.** Preload `teamStats`, `regularSeasonRecords.records` (hand-built) and `appState.selectionSunday: true`. Render `<SelectionSunday />`, recording dispatched actions with `recordActions`. Assert:
  - Each conference champion is its most-wins team, and each has `confChampion: true`.
  - Ties (Review Focus 2): with a two-way tie at the top, a three-way tie and an all-tied conference, the champion is the tied team with the highest score.
  - The 4 lowest-scoring champions are pushed to `playinTeams.sixteenSeeds`, lowest first.
  - At-large picks are the top `NUMBER_OF_AT_LARGE_TEAMS` non-champions by score, and the last 4 go to `playinTeams.elevenSeeds` in descending score order.
  - `tournamentTeams` holds 60 teams (`68 - 8`), sorted by score descending, with no duplicates. Champions + field + play-ins = 68 distinct teams.
  - Selection-score ties at the at-large cutoff (Review Focus 5) resolve by `Object.keys(records)` order.
  - Dispatch order: all `addConferenceChampion`, then 4 × `setPlayinTeams` (16), then 4 × `setPlayinTeams` (11), then `addTournamentTeams`, then `setTournamentSeeds`.
  - Re-rendering with `tournamentTeams` already set dispatches nothing.

  Use explicit expected arrays computed by hand from the built records, not a snapshot.
- [ ] **Step 2: Run** `npx vitest run tests/game/selectionSunday.test.tsx`. Expected: PASS.
- [ ] **Step 3: Commit** `test: characterize Selection Sunday`.

### Task 7: Seeding and bracket reducers (fixed contract)

**Files:**
- Test: `tests/game/tournamentSlice.test.ts`

- [ ] **Step 1: Write the tests** against `tournamentSlice.reducer` directly, with 60 teams named `s01`..`s60` in score order.
  - `setTournamentSeeds` gives these exact region arrays (write all four out):
    - west: `[s01, s08, s09, s16, …, playinGameSeed16Game1]`;
    - east: `[…, playinGameSeed16Game2]`;
    - south and midwest: `playinGameSeed11Game1` and `…Game2` at index 10.
  - Each region has 16 entries, and every team appears exactly once.
  - `setRoundOneMatchups`:
    - order per region is pairings 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15, with seed numbers;
    - play-in matchups pair `elevenSeeds[0]` v `[3]` and `[1]` v `[2]`, all with seed 11 (same for 16).
  - `setPlayinGameResults`:
    - eleven game 0 → `south[4][1].team`; game 1 → `midwest[4][1]`;
    - sixteen game 0 → `west[0][1]`; game 1 → `east[0][1]`;
    - the scores and `win` flags are set on the play-in matchup.
  - `setTournamentGameResults` for every round:
    - the winner is pushed into the next round at `floor(gameIndex/2)` with its seed;
    - scores and `win` are set;
    - elite eight east/west → `eastWest`, south/midwest → `southMidwest`;
    - final four → `championship`;
    - finals → `champion.champion[0]`.
- [ ] **Step 2: Run** `npx vitest run tests/game/tournamentSlice.test.ts`. Expected: PASS.
- [ ] **Step 3: Commit** `test: characterize seeding and bracket advancement`.

### Task 8: Picks and scoring (fixed contract)

**Files:**
- Test: `tests/game/picksAndScoring.test.ts`

- [ ] **Step 1: Write the tests.**
  - `setPick` per round:
    - it writes to `[floor(roundIndex/2)][roundIndex%2]` of the right round key;
    - an empty `team` writes nothing;
    - a non-empty `opponent` clears that opponent from every *later* round in every region, but not from the current round.
  - `replacePlayinPicksWithWinner` (Review Focus 4): a placeholder picked through to `champion` is replaced in every round.
  - `comparePicksAndGames`:
    - points are 10/20/40/80/160/320 for rounds 1, 2, sweet sixteen, elite eight, final four and finals;
    - `selected` is true only where the pick is among `winningTeams`;
    - `playerScore` accumulates across rounds.
  - Initial picks state when `NEXT_PUBLIC_APP_MODE !== "dev"`: all empty.
- [ ] **Step 2: Run** `npx vitest run tests/game/picksAndScoring.test.ts`. Expected: PASS.
- [ ] **Step 3: Commit** `test: characterize picks cascade and bracket scoring`.

### Task 9: Tournament drivers (components)

**Files:**
- Modify: `tests/game/helpers/runGame.ts`
- Test: `tests/game/tournamentDrivers.test.tsx`

**Interfaces:**
- Produces, in `runGame.ts`:
  - `pickChalk(store: AppStore): void` dispatches `setPick` for every game of every round, always picking the better seed (team index 0 on a tie). It walks rounds in order using the picks state as it fills.
  - `playTournament(store: AppStore): Promise<void>` mirrors the UI order:
    1. `activateTournament`, then `activateTournamentSelectionStage`;
    2. `setRoundOneMatchups` (as `Tournament.tsx` does on mount);
    3. `pickChalk`;
    4. `activateTournamentPlayinGamesState`;
    5. render `<PlayPlayinGames />`, then `<PlayTournamentGames />`, until `appState.tournamentRecap` is true.

- [ ] **Step 1: Write the invariant tests.** For seeds 1..10, start from a hand-built field (preloaded records and Selection Sunday run as in Task 6), call `playTournament`, and assert:
  - Play-in winners occupy the four placeholder slots, and the placeholders are gone from picks.
  - Each round has half the teams of the previous one: 64 → 32 → 16 → 8 → 4 → 2 → 1.
  - Every matchup has exactly one `win: true`, and only winners appear in the next round.
  - The champion is the finals winner.
  - `playerScore` equals Σ points over picks that match actual winners, recomputed independently in the test.
  - Phase flags are recorded in this order: `tournamentPlayPlayinGames → tournamentPlayGames/RoundOne → RoundTwo → SweetSixteen → EliteEight → FinalFour → Finals → tournamentRecap`, and `uiState` recap dialog is toggled once.
- [ ] **Step 2: Run** `npx vitest run tests/game/tournamentDrivers.test.tsx`. Expected: PASS.
- [ ] **Step 3: Commit** `test: characterize tournament driver components`.

### Task 10: Full-run test and full-run pin

**Files:**
- Test: `tests/game/fullRun.test.tsx`, `tests/game/draworder/fullRun.draworder.test.tsx`

**Interfaces:**
- Consumes: `configureStoreForLeague`, `playSeason`, `playTournament`, `pickChalk`.

- [ ] **Step 1: Write the full run.** For seeds 1..3, starting from an empty store:
  1. `configureStoreForLeague`;
  2. `activateRegularSeason`;
  3. `playSeason`;
  4. render `<SelectionSunday />`;
  5. `playTournament`.

  Assert end-to-end invariants:
  - 68 distinct teams in the field;
  - 1 champion;
  - `playerScore` recomputed independently;
  - the full sequence of `appState` flags.
- [ ] **Step 2: Write the full-run draw-order pin.** For seed 1, `toMatchSnapshot()` a compact digest:
  - per-team `wins-losses`;
  - champions;
  - `playinTeams`;
  - `tournamentSeeds`;
  - every round's `winner score-loser score` strings;
  - champion and `playerScore`;
  - total `Math.random` calls.
- [ ] **Step 3: Run** `npx vitest run tests/game` and check timing. Expected: PASS, with `tests/game` under 20 s.
- [ ] **Step 4: Commit** `test: add seeded full-run characterization of the game loop`.

### Task 11: Seedable `rng` in `playGame` (phase 2)

**Files:**
- Modify: `src/functions/playGame.ts`
- Test: `tests/game/playGameRng.test.ts`

**Interfaces:**
- Produces: `playGame(team1Stats: TeamStats, team2Stats: TeamStats, rng: () => number = Math.random): GameResult`. Every `Math.random()` call becomes `rng()`, in the same places and order. Callers are unchanged.

- [ ] **Step 1: Write the failing equivalence test.** For the 5 pairs from Task 2 and seeds 1-3, compare:
  - (a) the result and draw count with `seedMathRandom(seed)`;
  - (b) the result with `rng = mulberry32(seed)` passed in, counting calls through a wrapper.

  They must be identical, and in (b) a `Math.random` spy is called 0 times.
- [ ] **Step 2: Run** it. Expected: FAIL (`Math.random` is still called in (b)).
- [ ] **Step 3: Implement** the parameter.
- [ ] **Step 4: Run** `npx vitest run`. Expected: everything passes, including all phase-1 files unedited and draw-order snapshots unchanged (no snapshot written or updated).
- [ ] **Step 5: Commit** `refactor: let playGame take a seedable rng (default Math.random)`.

### Task 12: Extract `createSeasonSchedule` (phase 3)

**Files:**
- Create: `src/functions/regularSeason/createSeasonSchedule.ts`; export it from `src/functions/regularSeason/index.ts`
- Modify: `src/components/RegularSeason/SeasonSchedule.tsx`
- Test: `tests/unit/functions/createSeasonSchedule.test.ts`

**Interfaces:**
- Produces: `createSeasonSchedule(teamStats: ConferenceMap, teamArray: TeamSchedule[], rng: () => number = Math.random): ScheduledGame[]`, with `ScheduledGame = { weekNumber: string; matchup: TeamSchedule[] }`. It returns games in exactly the order today's component dispatches them, and it must not mutate `teamArray`.
  - The schedule pairing's `rng` lands here, not in Task 11, because pairing lives in the component until this extraction (ruling: spec phase 2 for the schedule is folded into phase 3).
  - `SeasonSchedule` keeps its props and effect, and dispatches `addGameToTeamSchedule` for each returned game in order.

- [ ] **Step 1: Write the failing tests.**
  - `createSeasonSchedule(..., mulberry32(seed))` gives the same games, and draws the same number of times, as `createSeasonSchedule(...)` with the default rng under `seedMathRandom(seed)`. Meanwhile `Math.random` is called 0 times when `rng` is passed.
  - The invariants from Task 4 hold on the returned list.
  - Proof that behaviour is unchanged comes from the Task 4 tests and the `seasonSchedule` draw-order snapshot passing unedited after the component switches to the function. That is the binding check, not this unit test.
  - `teamArray` is not mutated.
  - An odd-sized league gives the same output as the component.
- [ ] **Step 2: Run** it. Expected: FAIL (module missing).
- [ ] **Step 3: Implement.** Move `randomTeamSchedule`, the non-conference loop and the conference loop as they are, keeping the `Object.keys(teamStats)` conference order and the splice pairing. Replace `Math.random` with `rng`.
- [ ] **Step 4: Run** `npx vitest run`. Expected: all pass, phase-1 files unedited, snapshots unchanged.
- [ ] **Step 5: Commit** `refactor: extract season schedule creation into createSeasonSchedule`.

### Task 13: Extract `selectTournamentField` (phase 3)

**Files:**
- Create: `src/functions/regularSeason/selectTournamentField.ts`; export it from the barrel
- Modify: `src/components/RegularSeason/SelectionSunday.tsx`
- Test: `tests/unit/functions/selectTournamentField.test.ts`

**Interfaces:**
- Produces: `selectTournamentField(records: Record<string, RegularSeasonTeam>, conferenceArrays: ConferenceArrays): TournamentFieldSelection`, where `TournamentFieldSelection = { conferenceChampions: string[]; sixteenSeedPlayins: string[]; elevenSeedPlayins: string[]; field: string[] }`.
  - `conferenceChampions` is in conference-key order.
  - `sixteenSeedPlayins` is in today's dispatch order, lowest first.
  - `elevenSeedPlayins` is in today's dispatch order.
  - `field` is the final sorted array passed to `addTournamentTeams`.
  - The function is pure (no dispatch) and keeps the same sort calls on the same input orders, so ties resolve identically.
- `SelectionSunday` dispatches, in today's order:
  1. `addConferenceChampion` per champion;
  2. `setPlayinTeams` 16 × 4;
  3. `setPlayinTeams` 11 × 4;
  4. `addTournamentTeams(field)`;
  5. `setTournamentSeeds()`.

  It uses the same effect guard.

- [ ] **Step 1: Write the failing unit tests**, using the hand-built records from Task 6 (`buildRecords`) and the same expected arrays, including the tie cases.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** and slim the component.
- [ ] **Step 4: Run** `npx vitest run`, `npm run lint` and `npx tsc --noEmit`. Expected: all pass, Task 6 test unedited, snapshots unchanged.
- [ ] **Step 5: Commit** `refactor: extract tournament field selection into selectTournamentField`.

### Task 14: Docs and rule file (main session, not a subagent; it writes under `.claude/`)

**Files:**
- Create: `.claude/rules/game-engine.md`
- Modify: `CLAUDE.md`, `docs/DIAGNOSIS.md`

- [ ] **Step 1: Write `.claude/rules/game-engine.md`.** Frontmatter `paths:` is `src/functions/**`, `store/**`, `src/components/RegularSeason/**`, `src/components/Tournament/**`, `tests/factories/league*` and `tests/game/**`. The content covers:
  - the seeded `rng` (`playGame(..., rng)`, `createSeasonSchedule(..., rng)`, `tests/game/helpers/rng.ts`);
  - the three kinds of tests and where each lives;
  - fixed-contract tests and statistical expectations change only with a deliberate gameplay change, called out in the PR;
  - the regeneration procedure for draw-order pins:
    - only in a commit that changes draw order and nothing else;
    - statistical checks and fixed-contract tests pass unchanged in that commit;
    - `npx vitest run -u tests/game/draworder`;
    - the PR says the draw order changed and why;
  - how to measure new statistical expectations (the comment block convention).
- [ ] **Step 2: Update `CLAUDE.md`.**
  - Add a rule-index row: Game engine, `.claude/rules/game-engine.md`, its paths.
  - Replace the "Simulation output is random…" convention sentence with one pointing at the rule file.
- [ ] **Step 3: Update `docs/DIAGNOSIS.md`.**
  - Findings 8 and 9: mark them addressed and say how.
  - Roadmap step 6: done.
  - Add one new finding per oddity reported by Tasks 2-13, at minimum `setSeasonPlayed(true)` inside the per-week loop.
- [ ] **Step 4: Verify.** Run `npm run lint`, `npx tsc --noEmit` and `npx vitest run`. Expected: all green. Confirm `git diff main --stat -- tests/game` shows no changes to phase-1 test files in the commits from Tasks 11-13 (`git log -p` over those commits touches no `tests/game/*` file except new ones).
- [ ] **Step 5: Commit** `docs: game engine rule file, CLAUDE.md index, DIAGNOSIS step 6`.
