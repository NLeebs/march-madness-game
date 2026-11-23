# Step 10a: Replay Wiring and Season Pacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One shared component mounts the tournament replay (finding 41), `PlayTournamentGames` runs one effect instead of six with identical dispatches, and the regular season replays week by week at 0.15 s per week (findings 45, 33).

**Architecture:** A pure `getReplayRound(appState)` plus a per-round table drives a single effect in `PlayTournamentGames`. `TournamentReplay` holds `App.tsx`'s mount conditions and is used by `App.tsx` and `tests/game/helpers/runGame.ts`. `PlayRegularSeasonGames` becomes a deadline-scheduled `setTimeout` chain with cleanup that resumes from `weeksPlayed`.

**Tech Stack:** React 18, Redux Toolkit, Vitest + Testing Library (fake timers), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-step10-component-decomposition-design.md` (section "PR 10a").

## Global Constraints

- Branch `refactor/step10a-replay-pacing` (already created off `origin/main`, spec committed). Conventional commit prefixes; end each commit with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Behavior-preserving refactors (Tasks 1-3) and the pacing behavior change (Tasks 4-5) are separate commits.
- Tournament replay: dispatched actions, payloads and order identical to today's.
- Season replay: week n (1-based) of a fresh replay is applied at n x 150 ms after the replay starts, never before the previous week; the actions per week are unchanged unless Task 5 introduces the week action.
- No new `any`; type new code as if `strict` were on. Export new modules from barrels. Pure tournament functions import nothing at runtime from `@/store`; type-only imports are fine.
- Run vitest with `npx vitest run` (never watch mode). Never run `-u` outside `tests/game/draworder`; this PR must not change any draw-order pin.

## Review Focus

1. Season screen unmounted mid-replay (e.g. Play Again / restart while weeks are ticking): no dispatch after unmount, no stuck season on remount. Tested in Task 4.
2. Season arrives after mount (`season` null at first): replay starts when it arrives, week 1 at 150 ms after arrival. Tested in Task 4 (existing "waits for the season" test, retimed).
3. A tournament replay that crashes with no simulation still throws `GameDataError` through the single effect. Existing tests in `tests/game/tournamentDrivers.test.tsx` ("drivers without a simulation") must pass unchanged in Task 3.
4. `TournamentReplay` after the tournament (`tournamentRecap` true): `PlayTournamentGames` unmounted, nothing replayed twice. Tested in Task 2.
5. A week that takes longer than 150 ms to apply: the next week runs right after it (no skipped or doubled week). Tested in Task 4 with a slow dispatch.

---

### Task 1: Pin the full tournament replay action sequence

The existing test checks each action type separately. Before refactoring, pin the whole ordered sequence so Task 3 can prove nothing moved.

**Files:**
- Test: `tests/game/tournamentDrivers.test.tsx` (new `it` in `describe("drivers replay the stored simulation")`)

**Interfaces:**
- Produces: test `"drivers dispatch the whole replay in today's order"`, used unchanged by Tasks 2-3.

- [ ] **Step 1: Write the test**

Using `fieldStore(3)`, `seedMathRandom(3)` and `playTournament(store)` like the neighbouring test, take the actions dispatched by `playTournament` from the first `tournamentPlayersPicks/replacePlayinPicksWithWinner` onward, and assert `mine.map(a => ({ type: a.type, payload: a.payload }))` equals an expected list built explicitly from `simulation`:

```ts
const expected = [
  ...simulation.playin.flatMap((r) => [
    { type: "tournamentPlayersPicks/replacePlayinPicksWithWinner",
      payload: { gameIndex: r.gameIndex, winningTeam: r.winningTeam, seedType: r.seedType } },
    { type: "tournament/setPlayinGameResults", payload: r },
  ]),
  { type: "appState/activateTournamentStandardGames", payload: undefined },
  ...ROUNDS.flatMap((round, i) => [
    ...simulation.rounds[round].map((results) => ({
      type: "tournament/setTournamentGameResults", payload: { results, round } })),
    { type: "tournament/recordRoundScore",
      payload: { round, winningTeams: simulation.rounds[round].map((r) => r.winningTeam),
                 points: simulation.roundPoints[round], picks: picks[PICK_KEYS[i]] } },
    ...NEXT[i], // activateTournamentRoundTwo ... activateTournamentFinals; after finals: activateTournamentRecap then uiState/toggleRecapDialog
  ]),
];
```

`picks` is `store.getState().tournamentPlayersPicks.picks` read after the replay (the play-in replacement is applied before round 1 is scored, and the rounds don't change picks). `playTournament` renders only the drivers, so every action from the first `replacePlayinPicksWithWinner` onward must be in the list: compare the whole slice, with no filtering.

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/game/tournamentDrivers.test.tsx`
Expected: PASS (it characterizes today's code). If it fails, fix the expectation to match today's behaviour, not the code.

- [ ] **Step 3: Commit** — `test(tournament): pin the full replay action sequence`

---

### Task 2: `TournamentReplay` component (finding 41)

**Files:**
- Create: `src/components/Tournament/TournamentReplay.tsx`
- Modify: `src/components/Tournament/index.ts`, `src/components/App.tsx` (the two conditional blocks), `tests/game/helpers/runGame.ts` (delete `TournamentDrivers`, render `TournamentReplay`), `.claude/rules/game-engine.md` (drop "finding 41: keep the two in sync" from the `playTournament` helper bullet)
- Test: `tests/game/tournamentDrivers.test.tsx` (new `describe("TournamentReplay")`)

**Interfaces:**
- Produces: `export const TournamentReplay: React.FC` — renders `<PlayPlayinGames />` when `appState.tournament && appState.tournamentPlayPlayinGames`, and `<PlayTournamentGames />` when `appState.tournament && appState.tournamentPlayGames && !appState.tournamentRecap`. Nothing else.

- [ ] **Step 1: Write the failing test** `"TournamentReplay replays nothing once the tournament is over"`: after `playTournament(store)` completes, record actions, re-render `<TournamentReplay />` on the same store, flush with `act`, and assert no `tournament/*` or `appState/activate*` actions were dispatched and `tournamentRecap` is still true. Import `TournamentReplay` from `@/src/components/Tournament/TournamentReplay`.

- [ ] **Step 2: Run** `npx vitest run tests/game/tournamentDrivers.test.tsx` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `TournamentReplay`, export it from the barrel, use it in `App.tsx` and in `runGame.ts`'s `playTournament` (`React.createElement(TournamentReplay)`).

- [ ] **Step 4: Run** `npx vitest run tests/game src/components` — Expected: PASS, including Task 1's test.

- [ ] **Step 5: Commit** — `refactor(tournament): one TournamentReplay component for App and tests (finding 41)`

---

### Task 3: One effect in `PlayTournamentGames`

**Files:**
- Create: `src/functions/tournament/getReplayRound.ts` (+ export from `src/functions/tournament/index.ts`)
- Modify: `store/appStateSlice.ts` (export the `AppState` interface; type only), `src/components/Tournament/PlayTournamentGames.tsx`, `.claude/rules/game-engine.md` (replace "collapsing `PlayTournamentGames`' effects (step 10) is a draw-order change if it reorders games" with: the drivers draw no random numbers since step 9a-2; `PlayTournamentGames` runs one effect keyed on `getReplayRound`)
- Test: `tests/unit/functions/tournament/getReplayRound.test.ts`

**Interfaces:**
- Consumes: `ROUND_CONFIG[round].nextPicksKey` (`src/functions/tournament/roundConfig.ts`); its values are `roundTwoPicks`, `roundSweetSixteenPicks`, `roundEliteEightPicks`, `roundFinalFourPicks`, `roundFinalsPicks`, `champion` for rounds 1 ... finals, which match the picks each effect passes today.
- Produces: `type ReplayFlags = Pick<AppState, "tournamentPlayRoundOne" | "tournamentPlayRoundTwo" | "tournamentPlaySweetSixteen" | "tournamentPlayEliteEight" | "tournamentPlayFinalFour" | "tournamentPlayFinals" | "tournamentRecap">` and `getReplayRound(flags: ReplayFlags): ScoredRound | null`.

- [ ] **Step 1: Write the failing test.** Table test, deep-frozen input:
  - all false -> `null`
  - `RoundOne` only -> `1`; `RoundOne + RoundTwo` -> `2`; ... `RoundOne..FinalFour` -> `"final four"`; `RoundOne..Finals` -> `"finals"`; `RoundOne..Finals + Recap` -> `null`.
  - Rule (today's effect guards): round r is returned when its flag is true and the next flag (`RoundTwo` for 1, ..., `Recap` for finals) is false; the latest such round wins (with flags set cumulatively only one ever matches).

- [ ] **Step 2: Run** `npx vitest run tests/unit/functions/tournament/getReplayRound.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `getReplayRound`, then rewrite `PlayTournamentGames` with one `useEffect`: `const round = getReplayRound(appState); if (round === null) return;` play the round with the existing `playTournamentRound`, dispatch `recordRoundScore({ round, winningTeams, points, picks: playersPicks[ROUND_CONFIG[round].nextPicksKey] })`, then the next action from a `Record<ScoredRound, () => AnyAction[]>` table: `activateTournamentRoundTwo()` ... `activateTournamentFinals()`, and for finals `[activateTournamentRecap(), uiStateActions.toggleRecapDialog()]`. Keep the `GameDataError` throw when `simulation` is null.

- [ ] **Step 4: Run** `npx vitest run tests/game tests/unit/functions/tournament` — Expected: PASS, Task 1's sequence test unchanged.

- [ ] **Step 5: Commit** — `refactor(tournament): replay rounds from one effect`

---

### Task 4: Week-by-week season replay (findings 45, 33)

**Files:**
- Modify: `src/constants/CONSTANTS.ts` (rename `TIMER_PER_REGULAR_SEASON_GAME = 0.5` to `SECONDS_PER_REGULAR_SEASON_WEEK = 0.15`), `src/components/RegularSeason/PlayRegularSeasonGames.tsx`, `tests/game/helpers/runGame.ts` (`MAX_STEPS` 10 -> 20 so `playSeason`'s budget stays well above 4.5 s)
- Test: `src/components/RegularSeason/__tests__/PlayRegularSeasonGames.test.tsx`

**Interfaces:**
- Produces: `SECONDS_PER_REGULAR_SEASON_WEEK` (exported from `@/src/constants`). `PlayRegularSeasonGames` keeps its name, props (none) and the actions it dispatches.

- [ ] **Step 1: Rewrite the timing tests (failing).** Keep `expectFullReplay` (order and payloads unchanged). Change and add:
  - `"replays week n at n x 150 ms"`: after render, advance 149 ms -> no replay actions; advance 1 ms -> exactly week 1's games + one `addWeekPlayedToTotal`; then for each later week advance 149 ms (nothing new) and 1 ms (that week's actions). After week 30, `expectFullReplay(actions)`, `weeksPlayed === 30`, `selectionSunday === true`.
  - `"replay waits for the season and then plays all 30 weeks"`: as today, but after `setSeason` advance `30 * 150` ms.
  - `"stops on unmount and resumes from weeksPlayed on remount"`: render, advance `10 * 150` ms, `unmount()`, advance 5000 ms -> `weeksPlayed === 10` and no new actions; render again, advance `20 * 150` ms -> `weeksPlayed === 30`, `expectFullReplay(actions)` (each week once, in order).
  - `"a slow week delays the next one without skipping or doubling"`: add a middleware that advances `Date.now` by 400 ms (`vi.setSystemTime(Date.now() + 400)`) the first time it sees `addWeekPlayedToTotal`; assert all 30 weeks still arrive once each, in order, within `30 * 150 + 400` ms of simulated time.
  - Keep `"never calls playGame"` (advance 5000 ms).

- [ ] **Step 2: Run** `npx vitest run src/components/RegularSeason/__tests__/PlayRegularSeasonGames.test.tsx` — Expected: FAIL (everything arrives at 500 ms today).

- [ ] **Step 3: Implement.** Remove the `seasonPlayed` state and `playRegularSeasonGames` callback (finding 33). One effect with deps `[season, dispatch, store]` (`const store = useStore<RootState>()`):

```
if (!season) return;
let cancelled = false; let timer: ReturnType<typeof setTimeout> | undefined;
const start = Date.now(); const first = store.getState().regularSeasonRecords.weeksPlayed;
const step = (week: number) => {          // week = index into season.weeks
  if (cancelled || week >= season.weeks.length) return;
  const due = start + (week - first + 1) * SECONDS_PER_REGULAR_SEASON_WEEK * 1000;
  timer = setTimeout(() => {
    if (cancelled) return;
    season.weeks[week].forEach((g) => dispatch(addRegularSeasonGameResult(g)));
    dispatch(addWeekPlayedToTotal());
    step(week + 1);
  }, Math.max(0, due - Date.now()));
};
step(first);
return () => { cancelled = true; clearTimeout(timer); };
```

Keep the separate effect that dispatches `activateSelectionSunday` when `weeksPlayed === AMOUNT_SEASON_GAMES`. Update the component's doc comment. The `delay` helper is no longer used here (leave it; other code may use it).

- [ ] **Step 4: Run** `npx vitest run src/components/RegularSeason tests/game` — Expected: PASS; draw-order pins unchanged (`tests/game/draworder` must pass without `-u`).

- [ ] **Step 5: Commit** — `fix(season): replay the season week by week at 0.15 s per week (findings 45, 33)`

---

### Task 5: Measure a week's cost; batch it only if needed

**Files (only if batching):**
- Modify: `store/regularSeasonRecordSlice.ts` (add `addRegularSeasonWeekResults(state, action: PayloadAction<GameResult[]>)` applying `applySeasonGameResult` to each result in order), `PlayRegularSeasonGames.tsx` (one dispatch per week instead of one per game), `PlayRegularSeasonGames.test.tsx` (`expectFullReplay` asserts one week action per week whose payload equals `season.weeks[n]`, then `addWeekPlayedToTotal`)
- Test: `tests/game/regularSeason.test.tsx` — new `"week action leaves the same records as per-game actions"`: apply a season's weeks both ways on two fresh stores; `regularSeasonRecords` deep-equal.

- [ ] **Step 1: Measure.** `npm run build && npx next start -p 3100` (with `.env.local`), open `http://localhost:3100` in Chromium via the Playwright MCP, start a game, and record the longest main-thread task during the season replay (Performance panel, or `PerformanceObserver({ type: "longtask" })` injected before Start). Write the number in the PR description.
- [ ] **Step 2: Decide.** Longest week task <= 50 ms: no code change; go to Task 6. Above 50 ms: do Steps 3-5.
- [ ] **Step 3:** Write the equivalence test and the updated `expectFullReplay`; run `npx vitest run tests/game/regularSeason.test.tsx src/components/RegularSeason` — Expected: FAIL (no such action).
- [ ] **Step 4:** Implement the reducer and the one-dispatch-per-week replay; rerun — Expected: PASS; draw-order pins unchanged. Re-measure and record the new longest task.
- [ ] **Step 5: Commit** — `perf(season): apply each replayed week in one action`

---

### Task 6: E2E, docs, full verification

**Files:**
- Modify: `e2e/resize.spec.ts` (comment block at step "1. Regular season in progress": the weeks now tick every 0.15 s instead of all falling due together; the paused `page.clock` stays because the full-state comparison needs a frozen season), `.claude/rules/e2e.md` (the `page.clock` bullet: drop "resolves all its week timers at once and blocks the page for ~5 s (finding 45)", keep the freeze-for-comparison reason), `e2e/support/timeouts.ts` only if a phase now fails its bound, `docs/DIAGNOSIS.md`, `.claude/rules/game-engine.md` (any remaining sentence about the season's timing)

- [ ] **Step 1: DIAGNOSIS.** Mark finding 41 fixed (`TournamentReplay`), 33 fixed, 45 fixed for the replay ("weeks play one after another, 0.15 s apart, about 4.5 s"). Add finding 57: "Low - Start to the season screen takes ~8-10 s (split from finding 45): the season request plus the screen transition. Not investigated." In the roadmap row for step 10, note "10a done" once merged (write it in this PR as "10a: replay wiring and pacing").
- [ ] **Step 2: Run the unit suite, lint and types.** `npx vitest run`, `npm run lint`, `npx tsc --noEmit` — Expected: all pass, no new errors.
- [ ] **Step 3: Run e2e.** `npm run e2e` — Expected: all pass. If `season` phase timings changed, note them; adjust `PHASE_TIMEOUTS` only if a bound is actually exceeded, with the measurement in the comment.
- [ ] **Step 4: Commit** — `docs: step 10a findings and e2e notes`
- [ ] **Step 5:** Use superpowers:verification-before-completion, then superpowers:finishing-a-development-branch (PR against `main`, body ends with the Claude Code attribution line).
