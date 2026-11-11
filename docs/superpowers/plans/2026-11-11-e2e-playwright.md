# Playwright E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Playwright tests that play the real game in Chromium and fail on the breakages listed in the spec (errors, stalls, wrong game counts/champions/pick slots/highlights/score, navigation, reset, recap, save payload, login/logout, dashboards, layout at every size and on live resize), running as a CI job.

**Architecture:** A production build (`next build && next start`) runs under Playwright's `webServer`. Every browser call to `/api/**` and to the fake Supabase auth URL is answered by `page.route` from typed fixtures built on step 6's `buildLeague()`. Assertions read the screen. A read-only Redux snapshot on `window` (compiled in only when `NEXT_PUBLIC_E2E=1`) supplies expected values the screen doesn't show. Checks live in small `e2e/checks/*` modules and the spec files compose them.

**Tech Stack:** `@playwright/test` (Chromium), Next.js 14, Redux Toolkit, vitest (for the two new app seams), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-11-e2e-playwright-design.md`. Read it first; item numbers (1-13) below refer to it.

## Global Constraints

- Chromium only. `retries: 0` locally and in CI. No fixed sleeps (`waitForTimeout` is banned); wait on conditions.
- No real Supabase, Firebase or Vercel calls, and no new secrets. Every unhandled `/api/**` request fails the test.
- Product-code changes are limited to `data-testid`, `aria-label`/`role` attributes, exporting the scoring constant, and the e2e-only store exposure. No behaviour change. The step 6 suite (`npx vitest run`) stays green with no pin regeneration.
- `NEXT_PUBLIC_APP_MODE` must be unset in the e2e build (no pre-filled picks).
- Viewports: phone 390x844, tablet 768x1024, laptop 1440x900, wide 2560x1440. Breakpoints come from `src/constants` (640, 768, 1024, 1400, 1700, 2040, 2350); import them, don't retype them.
- Points per correct pick: 10/20/40/80/160/320, read from the exported constant (Task 2), never retyped in tests.
- The E2E CI job finishes in under 10 minutes wall-clock.
- TypeScript, no new `any`, `import type` for anything from `application/`, `infrastructure/` or `app/` (keeps server modules out of Playwright's Node process).
- Conventional commits on branch `feat/e2e-playwright`. Docs go in this PR.
- "Watch it fail" for e2e checks means a **sabotage step**: temporarily break the app in the stated way, see the named test go red for that reason, then revert. The sabotage is never committed.

## Review Focus

1. **Slow data on the start screen.** Team stats that take 2 s: Start stays disabled until they're loaded, and clicking it early doesn't start a broken game. Test in Task 1.
2. **Choosing a different year before starting.** Selecting the older fixture year must load that year's teams (the request goes to that year's id) and the game must run on them. Test in Task 1.
3. **Double-clicking Start.** The season must still play exactly once, so game counts stay correct. Test in Task 4.
4. **Picking a play-in placeholder to advance.** A `playinGameSeed..` slot picked into round 2 must highlight and score correctly once the play-in resolves. Test in Task 6, with the pick forced in Task 5's driver.
5. **Reloading mid-game.** State isn't persisted, so a reload mid-tournament must land cleanly on the start screen with no errors, and a new game must work. Test in Task 3.

---

## File map

| File | Responsibility |
|---|---|
| `playwright.config.ts` | webServer (build + start, e2e env), projects per viewport, tag routing, reporter, trace on failure |
| `e2e/fixtures/league.ts` | Years, team stats, scoring-rules responses (typed) |
| `e2e/fixtures/dashboard.ts` | Profile and dashboard endpoint responses (typed) |
| `e2e/support/fakeBackend.ts` | `page.route` for `/api/**`; records persist requests and unhandled calls |
| `e2e/support/fakeAuth.ts` | Fake Supabase URL, fake user/session, routes for `/auth/v1/**` |
| `e2e/support/errorWatch.ts` | Console/page-error/toast watcher with an allowlist |
| `e2e/support/test.ts` | Extended Playwright `test` with `backend`, `errors`, `game` fixtures |
| `e2e/support/state.ts` | Reads the e2e Redux snapshot |
| `e2e/support/game.ts` | `GamePage` driver: phases, picks, recap, restart |
| `e2e/support/layout.ts` | Measured layout helpers and `layoutSignature` |
| `e2e/checks/season.ts`, `picks.ts`, `results.ts` | The rule checks for items 3-6 and 9 |
| `e2e/*.spec.ts` | Specs (listed per task) |
| `src/utils/exposeStoreForE2e.ts` | e2e-only `window.__MADNESS_E2E__` |
| `store/tournamentSlice.ts` | Export `ROUND_POINTS` |
| `.claude/rules/e2e.md`, `CLAUDE.md`, `docs/DIAGNOSIS.md`, `.github/workflows/ci.yml`, `vitest.config.ts`, `package.json`, `.gitignore` | Wiring and docs |

---

### Task 1: Scaffold, fake backend, error watch, CI job, start-screen tests

**Files:**
- Create: `playwright.config.ts`, `e2e/fixtures/league.ts`, `e2e/support/fakeBackend.ts`, `e2e/support/fakeAuth.ts`, `e2e/support/errorWatch.ts`, `e2e/support/test.ts`, `e2e/start.spec.ts`
- Modify: `package.json` (devDependency `@playwright/test`, scripts `e2e`, `e2e:ui`), `vitest.config.ts` (exclude `e2e/**`), `.gitignore` (`/playwright-report`, `/test-results`), `.github/workflows/ci.yml` (new `e2e` job), `src/components/UI/StartButton.tsx` (`aria-label="Start the game"`)

**Interfaces:**
- Produces:
  - `FAKE_SUPABASE_URL = "http://127.0.0.1:54399"` (nothing listens there), `FAKE_ANON_KEY = "e2e-anon-key"` in `fakeAuth.ts`. The webServer env uses these.
  - `E2E_YEARS: Awaited<ReturnType<typeof getYears>>`: two years, `{ id: "e2e-year-older", year: 2024 }` then `{ id: "e2e-year-latest", year: 2025 }` (latest last; the app picks the last one).
  - `e2eTeamStats(yearId: string): ConferenceMap`. Latest = `buildLeague().teamStats`. Older = the same league with conference `conf01` dropped (so the tests can tell the two apart). Every team's `logo` is set to `/team-logos/acc/DukeLogo.png`, which exists in `public/`.
  - `installFakeBackend(page: Page, opts?: FakeBackendOptions): Promise<FakeBackend>`
    - `FakeBackendOptions = { persistStatus?: number; teamStatsDelayMs?: number; user?: FakeUser | null; dashboard?: boolean }`
    - `FakeBackend = { persistRequests: SimulationRequestBody[]; requestedPaths: string[]; unhandled: string[] }`
    - An unmatched `/api/**` request returns 501 and is pushed to `unhandled`.
  - `watchForErrors(page: Page): ErrorWatch` with `ErrorWatch = { allow(pattern: RegExp, reason: string): void; assertClean(): void }`. Fails on `console.error`, `pageerror`, and any `[data-sonner-toaster] [data-type="error"]` element (inert until a Toaster is mounted).
  - `test` from `e2e/support/test.ts` has auto fixtures `backend: FakeBackend` and `errors: ErrorWatch`. After each test it asserts `errors.assertClean()` and that `backend.unhandled` is empty. Every spec imports `test`/`expect` from here, never from `@playwright/test`.

- [ ] **Step 1: Install Playwright.** `npm i -D @playwright/test@1.56.1` (pin exact; any 1.5x release at least two weeks old is fine) and `npx playwright install chromium`. Add scripts `"e2e": "playwright test"` and `"e2e:ui": "playwright test --ui"`. Add `"e2e/**"` to vitest's `exclude`.

- [ ] **Step 2: Write `playwright.config.ts`.**
  - `testDir: "e2e"`, `retries: 0`, `fullyParallel: true`, `workers: process.env.CI ? 2 : undefined`, `use.trace: "retain-on-failure"`, `use.baseURL: "http://127.0.0.1:3100"`, reporter `[["list"], ["html", { open: "never" }]]`.
  - `webServer.command: "npm run build && npx next start -p 3100"`, `timeout: 240_000`, `reuseExistingServer: !process.env.CI`.
  - `webServer.env`: `NEXT_PUBLIC_SUPABASE_URL=FAKE_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=FAKE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY=e2e-unused`, `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3100`, `NEXT_PUBLIC_E2E=1`, `NEXT_PUBLIC_APP_MODE=""`. Add dummy `NEXT_PUBLIC_FIREBASE_*` values only if the build fails without them.
  - Start with one project, `laptop` (1440x900, `grepInvert: /@wide/`). Task 7 adds the rest.

- [ ] **Step 3: Write the fixtures, fake backend, error watch and `test`** per the Interfaces above.
  - Fake backend routes in this task: `GET /api/years`, `GET /api/team-statistics/:yearId` (honours `teamStatsDelayMs`, 404 for an unknown id), `GET /api/tournament-scoring-rules/:yearId` (read that route to get the response shape), and `POST /api/bracket/simulation` (records the parsed body, answers `persistStatus ?? 200` with a body typed as `PersistTournamentResult`).
  - Fake auth: route `${FAKE_SUPABASE_URL}/auth/v1/**` so that, logged out, nothing errors. Task 9 adds login.

- [ ] **Step 4: Write `e2e/start.spec.ts`.**
  ```ts
  test("starts the latest year and reaches the regular season", async ({ page, backend }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start the game" }).click();
    await expect(page.getByTestId("regular-season")).toBeVisible({ timeout: 10_000 });
    expect(backend.requestedPaths).toContain("/api/team-statistics/e2e-year-latest");
  });
  test("start waits for slow team stats", async ({ page }) => { /* teamStatsDelayMs: 2000; Start disabled until stats load, then the game starts */ });
  test("choosing the older year plays that year's league", async ({ page, backend }) => { /* pick 2024 in the year select; request goes to e2e-year-older; no conf01 team on screen */ });
  test("middleware does not hang on the fake Supabase URL", async ({ page }) => {
    const started = Date.now();
    await page.goto("/");
    expect(Date.now() - started).toBeLessThan(3_000);
  });
  ```
  Add `data-testid="regular-season"` to `RegularSeason.tsx`'s root.

- [ ] **Step 5: Run.** `npx playwright test e2e/start.spec.ts`. Expected: 4 passed. If the middleware test fails, make the fake URL refuse connections quickly (it already should, since nothing listens on 54399) before trying anything else.

- [ ] **Step 6: Sabotage.**
  - Make `useTeamStatistics` fetch `/api/team-stats/` instead. `starts the latest year` must fail, with an `unhandled` entry.
  - Add `console.error("x")` to `StartScreen`. The error watch must fail the test.
  - Revert both.

- [ ] **Step 7: Add the CI job** to `.github/workflows/ci.yml`:
  - job `e2e` ("End-to-end tests"), `runs-on: ubuntu-latest`, `timeout-minutes: 15`;
  - steps: checkout, setup-node 22 with npm cache, `npm ci`, `npx playwright install --with-deps chromium`, `npx playwright test`;
  - on failure, `actions/upload-artifact@v4` uploads `playwright-report/` and `test-results/` with 7-day retention.

- [ ] **Step 8: Verify the rest still passes.** `npx vitest run`, `npm run lint`, `npx tsc --noEmit`, all green.

- [ ] **Step 9: Commit.** `test(e2e): Playwright scaffold, fake backend and start-screen tests`

### Task 2: Test seams: store snapshot, scoring constant, locators

**Files:**
- Create: `src/utils/exposeStoreForE2e.ts`, `tests/unit/utils/exposeStoreForE2e.test.ts`, `e2e/support/state.ts`
- Modify: `src/utils/index.ts` (barrel), `app/page.tsx` (call it once at module scope), `store/tournamentSlice.ts`, `tests/game/picksAndScoring.test.ts`, and the locator attributes listed in Step 7

**Interfaces:**
- Produces:
  - `exposeStoreForE2e(store: Pick<AppStore, "getState">, enabled: boolean = process.env.NEXT_PUBLIC_E2E === "1"): void`. When enabled and `window` exists, it sets `window.__MADNESS_E2E__ = { getState: () => store.getState() }`. Otherwise it does nothing. Declare the global type in the same file.
  - `ROUND_POINTS: Readonly<Record<1 | 2 | "sweet sixteen" | "elite eight" | "final four" | "finals", number>>`, exported from `store/tournamentSlice.ts` (and its barrel), with values 10/20/40/80/160/320. `comparePicksAndGames` reads `ROUND_POINTS[action.payload.round]`.
  - `readState(page: Page): Promise<RootState>` in `e2e/support/state.ts` (an `import type` of `RootState`). It throws a clear error if `__MADNESS_E2E__` is missing.
  - Test IDs (Step 7):
    - `bracket-column-<roundKey>`, where `roundKey` is one of `playin | 1 | 2 | sweet-sixteen | elite-eight | final-four | finals | champion`;
    - `conference-group-<conferenceKey>`;
    - `round-select-banner`.
  - `role="dialog"` with `aria-label` from `Dialog`'s new optional `ariaLabel` prop. Callers pass "Tournament recap" and "Login".
  - `aria-label="Play the tournament"` on `PlayTournamentButton` if its accessible name is empty.

- [ ] **Step 1: Write the failing unit tests.**
  ```ts
  it("exposes getState on window when enabled", () => { exposeStoreForE2e(store, true); expect(window.__MADNESS_E2E__?.getState()).toBe(store.getState()); });
  it("does nothing when disabled", () => { delete window.__MADNESS_E2E__; exposeStoreForE2e(store, false); expect(window.__MADNESS_E2E__).toBeUndefined(); });
  ```
  In `picksAndScoring.test.ts`, add `expect(ROUND_POINTS).toEqual({ 1: 10, 2: 20, "sweet sixteen": 40, "elite eight": 80, "final four": 160, finals: 320 })`.

- [ ] **Step 2: Run** `npx vitest run tests/unit/utils/exposeStoreForE2e.test.ts tests/game/picksAndScoring.test.ts`. Expected: FAIL (module / export not found).

- [ ] **Step 3: Implement `exposeStoreForE2e` and `ROUND_POINTS`,** and switch `comparePicksAndGames` to `ROUND_POINTS`. `nextRoundKey` stays as it is; it is step 8's job.

- [ ] **Step 4: Run** `npx vitest run`. Expected: all pass, with no snapshot changes in `tests/game/draworder`.

- [ ] **Step 5: Wire `app/page.tsx`** to call `exposeStoreForE2e(store)`. Then check that it is compiled out of production builds: run `npm run build` without `NEXT_PUBLIC_E2E`, then `grep -r "__MADNESS_E2E__" .next/static`. Expected: no matches. Record this in the commit message.

- [ ] **Step 6: Add the e2e smoke check** to `e2e/start.spec.ts`: after Start, `(await readState(page)).appState.regularSeason` is `true`.

- [ ] **Step 7: Add the test IDs and ARIA attributes:**
  - bracket columns in `Tournament.tsx` (each column `motion.div`, small-screen and large-screen play-ins);
  - `ConferenceGroups.tsx`;
  - `RoundSelectBanner.tsx`;
  - `Dialog.tsx` plus its two callers;
  - `PlayTournamentButton.tsx`.

  Then run `npx vitest run` and `npx playwright test`. Expected: green.

- [ ] **Step 8: Commit.** `test(e2e): e2e-only store snapshot, exported ROUND_POINTS, test ids`

### Task 3: Game driver, phase timing, restart, reload

**Files:**
- Create: `e2e/support/game.ts`, `e2e/game-flow.spec.ts`
- Modify: `e2e/support/test.ts` (add the `game` fixture)

**Interfaces:**
- Consumes: Tasks 1-2.
- Produces: `class GamePage` (fixture `game`):
  - `open(): Promise<void>`: `goto("/")`, wait for Start to be enabled.
  - `start(): Promise<void>`: click Start; regular season visible within `PHASE_TIMEOUTS.toSeason`.
  - `finishSeason(): Promise<void>`: "Go to Tournament" visible within `PHASE_TIMEOUTS.season`.
  - `goToTournament(): Promise<void>`: click it; the round-1 column is visible within `PHASE_TIMEOUTS.toSelection`.
  - `makePicks(seed: number): Promise<RecordedPick[]>`: Task 5 fills it in; until then it picks chalk (the first team in each matchup) through the UI.
  - `playTournament(): Promise<void>`: click Play; play-ins, then all rounds; "See Recap" visible within `PHASE_TIMEOUTS.tournament`.
  - `openRecap(): Promise<Locator>`: click "See Recap"; returns the `Tournament recap` dialog.
  - `restart(): Promise<void>`: "Play Again" in the dialog; the start screen is back within `PHASE_TIMEOUTS.toStart`.
  - `RecordedPick = { round: TournamentRound; region: string; slot: number; team: string }`.
  - `PHASE_TIMEOUTS: { toSeason; season; toSelection; tournament; toStart }` in ms.
  - The driver navigates the round banner itself whenever `round-select-banner` is visible, so it works at every width.

- [ ] **Step 1: Write `e2e/game-flow.spec.ts` "plays a full game and restarts into a clean second game"** (tag `@every-size`):
  - `open`, `start`, `finishSeason`, `goToTournament`, `makePicks(1)`, `playTournament`, `openRecap`, `restart`;
  - then assert `readState` shows empty picks, `playerScore === 0`, no seeds and zero records;
  - then play a second full game to the recap.

- [ ] **Step 2: Write "reload mid-tournament returns to a clean start"**: reload during `playTournament`, expect the start screen with no errors, then `start()` works.

- [ ] **Step 3: Measure.** Run `npx playwright test e2e/game-flow.spec.ts --repeat-each 3` locally. Set each `PHASE_TIMEOUTS` value to about 2.5x the slowest measured phase. Put the measurements in a comment next to the constants (date and machine).

- [ ] **Step 4: Run.** Expected: both pass.

- [ ] **Step 5: Sabotage.** Comment out `dispatch(appStateActions.activateTournamentSelectionStage())` in `RegularSeason.tsx`. `goToTournament` must fail at its time limit with a message naming the phase, not at the global timeout. Revert.

- [ ] **Step 6: Commit.** `test(e2e): game driver with phase time limits, restart and reload`

### Task 4: Regular season and Selection Sunday checks (items 3, 4)

**Files:**
- Create: `e2e/checks/season.ts`
- Modify: `e2e/game-flow.spec.ts`

**Interfaces:**
- Produces:
  - `checkGameCounts(page: Page): Promise<void>`. For every team, on-screen `W-L` (from `TeamBar`, in the regular-season view at the end of the season) satisfies wins + losses = `readState().teamSchedule` game count for that team, and that count ≤ 30. The schedule shape is in `store/teamScheduleSlice.ts`. Teams in conferences hidden at the current width use the state values only.
  - `checkConferenceChampions(page: Page): Promise<void>`. For each `conference-group-*` on screen during Selection Sunday, the team showing the trophy icon has the most wins among that group's on-screen records. On a tie, any tied team passes (finding 37). Every visible conference has exactly one trophy. Locate the trophy through `PingNotification`'s icon; add `data-testid="conf-champion-icon"` there if needed.

- [ ] **Step 1: Call both checks** in the full-game test, after `finishSeason` and after `goToTournament`'s Selection Sunday view respectively (read `RegularSeason.tsx`/`SelectionSunday.tsx` for exactly when records and icons show).
- [ ] **Step 2: Add "double-clicking Start plays the season once"** (Review Focus 3): `dblclick` Start, `finishSeason`, `checkGameCounts`.
- [ ] **Step 3: Run.** Expected: pass at laptop width.
- [ ] **Step 4: Sabotage.**
  - In `PlayRegularSeasonGames`, play the last week twice. `checkGameCounts` must fail.
  - In `selectTournamentField`'s `confChampion`, return `sortedByWins[1]`. `checkConferenceChampions` must fail.
  - Revert both.
- [ ] **Step 5: Commit.** `test(e2e): game-count and conference-champion checks`

### Task 5: Picks and tournament navigation (items 5, 7)

**Files:**
- Create: `e2e/checks/picks.ts`, `e2e/navigation.spec.ts`
- Modify: `e2e/support/game.ts` (real `makePicks`), `e2e/game-flow.spec.ts`

**Interfaces:**
- Consumes: `getNextRoundInfo` exported from `src/components/Tournament/TournamentMatchup.tsx`. Import it as a value; it is pure. If importing it would pull React or Redux into Node, copy its mapping table into `e2e/support/bracketMap.ts` and add a vitest test asserting the two agree.
- Produces:
  - `makePicks(seed)`: uses `mulberry32(seed)` from `tests/game/helpers/rng.ts` to choose each winner, picks round by round through the UI, and returns `RecordedPick[]`. It must pick at least one play-in placeholder (`playinGameSeed...`) to win its round-1 game (Review Focus 4).
  - `checkPickLandsInNextSlot(page, pick: RecordedPick): Promise<void>`: the `button[data-team]` at the slot given by `getNextRoundInfo` shows `pick.team`.
  - `checkCascadeClears(page): Promise<void>`: change an earlier pick for a team that was advanced at least two rounds; that team is gone from every later round.

- [ ] **Step 1: Write `makePicks`.** It calls `checkPickLandsInNextSlot` after every click. In the full-game test, call `checkCascadeClears` before making the final picks.
- [ ] **Step 2: Write `e2e/navigation.spec.ts`** (`@every-size`; it skips itself when the banner isn't visible). Click each banner button "Round of 64" ... "Finals" and the back button. The matching `bracket-column-*` becomes visible and the selected button is marked. Read `RoundSelectButton.tsx` for how the selection shows.
- [ ] **Step 3: Run.** Expected: pass.
- [ ] **Step 4: Sabotage.**
  - Swap `teamIndex` 0/1 in one `getNextRoundInfo` mapping entry inside `TournamentMatchup.tsx` only (not the test copy). `checkPickLandsInNextSlot` must fail.
  - Make one banner button select the wrong round. The navigation test must fail.
  - Revert both.
- [ ] **Step 5: Commit.** `test(e2e): pick placement, cascade and round navigation`

### Task 6: Results, score, recap and save payload (items 6, 9, 12 logged out)

**Files:**
- Create: `e2e/checks/results.ts`, `e2e/save-failure.spec.ts`
- Modify: `e2e/game-flow.spec.ts`

**Interfaces:**
- Consumes: `ROUND_POINTS`, `RecordedPick[]`, `readState`.
- Produces:
  - `checkHighlights(page): Promise<number>`. For every `PlayerPickBar` in rounds 2..champion, the bar is green (`bg-green-100`) when its text equals the adjacent `button[data-team]` team, and red (`bg-red-100` + `line-through`) otherwise. A play-in placeholder pick counts as equal when the placeholder resolved to that team; take the resolution from `readState().tournament.roundOneMatchups.playin`. It returns the weighted total: each green bar in round R scores `ROUND_POINTS[previous round of R]`.
  - `checkScore(page, expected: number)`: the "Score" value in `PlayerScore` equals `expected`.
  - `checkRecap(dialog: Locator, page)`:
    - the logo `src` contains the champion's logo path (`/team-logos/acc/DukeLogo.png`) and `#<seed> Seed` matches `readState().tournament.champion.champion[0][0]`;
    - the genius/"Not sure why you picked X" line matches the champion pick;
    - the dialog score equals the on-page score.
  - `checkPersistPayload(backend, picks: RecordedPick[], expectUserId: string | null)`:
    - exactly one request;
    - `userId === expectUserId`;
    - when logged out, `anonUserId` equals the value in `localStorage` (key from `src/utils/getAnonUserId.ts`);
    - each recorded pick is present in `picksState.picks` at its round/region/slot.

- [ ] **Step 1: In the full-game test,** after `playTournament`, run `checkScore(page, await checkHighlights(page))`, then `openRecap` + `checkRecap`, then `checkPersistPayload(backend, picks, null)`.
- [ ] **Step 2: Write `e2e/save-failure.spec.ts`** (laptop): `persistStatus: 500`. The game reaches the recap, the recap renders, "Play Again" restarts, and no page error occurs. This pins today's silent failure. If the failed mutation logs a console error, allowlist it here only with the reason "silent save failure, finding 43".
- [ ] **Step 3: Run.** Expected: pass.
- [ ] **Step 4: Sabotage.**
  - Make `PlayerPickBar` use green for both cases. `checkHighlights` must fail.
  - Change `ROUND_POINTS.finals` to 300 only in the reducer's lookup (use a literal in the reducer temporarily). `checkScore` must fail.
  - Drop `picksState` from the `TournamentPersist` body. `checkPersistPayload` must fail.
  - Revert all three.
- [ ] **Step 5: Commit.** `test(e2e): highlight, score, recap and save-payload checks`

### Task 7: Every screen size (responsiveness, part 1)

**Files:**
- Create: `e2e/support/layout.ts`, `e2e/wide.spec.ts`
- Modify: `playwright.config.ts`, `e2e/support/game.ts`, `e2e/game-flow.spec.ts`

**Interfaces:**
- Produces:
  - Projects:
    - `phone` (390x844, `isMobile: true`, `hasTouch: true`, `grep: /@every-size|@mobile-too/`);
    - `tablet` (768x1024, `grep: /@every-size/`);
    - `laptop` (1440x900, `grepInvert: /@wide/`);
    - `wide` (2560x1440, `grep: /@wide/`).
  - `assertNoHorizontalScroll(page)`: `document.documentElement.scrollWidth <= window.innerWidth`.
  - `assertUsable(locator)`: `scrollIntoViewIfNeeded`, the bounding box is fully inside the viewport, and a trial click (`click({ trial: true })`) succeeds.
  - `assertNoOverlap(page, selector: string)`: no two visible elements matching `selector` overlap by more than 1px. Use it on `button.team-selection` within the visible bracket columns.
  - `layoutSignature(page): Promise<LayoutSignature>`, where `LayoutSignature = { bannerVisible: boolean; visibleColumns: string[] }` (visible `bracket-column-*` ids, sorted).
  - `GamePage` calls `assertUsable` on every control before clicking it, and calls `assertNoHorizontalScroll` after each phase change.

- [ ] **Step 1: Add the projects and the `GamePage` hooks.** In the full-game test, after `goToTournament` and after `playTournament`, call `assertNoOverlap`.
- [ ] **Step 2: Write `e2e/wide.spec.ts`** (`@wide`). Play to the tournament. `round-select-banner` is hidden, and every round column from 1 to champion is visible at once. Picks and play then complete without banner navigation, and the highlight/score checks pass.
- [ ] **Step 3: Run** `npx playwright test`. Expected: all projects pass. Note the wall-clock time; if it is over 6 minutes locally, raise it before Task 8. The fix is `page.clock` fast-forwarding inside `GamePage` with the stall checks kept, per the spec.
- [ ] **Step 4: Sabotage.**
  - Give the `Tournament.tsx` wrapper `min-w-[1200px]`. The phone project must fail on horizontal scroll.
  - Show the banner above `TOURNAMENT_BREAK_POINT`. The wide test must fail.
  - Revert both.
- [ ] **Step 5: Commit.** `test(e2e): phone, tablet, laptop and wide projects with layout checks`

### Task 8: Live resize (responsiveness, part 2)

**Files:**
- Create: `e2e/resize.spec.ts`

**Interfaces:**
- Consumes: `layoutSignature`, `GamePage`, `readState`.
- Produces: `resizeAndCompare(page, width: number): Promise<void>`:
  1. Snapshot the game state (`readState`, minus `uiState.screenWidth`/`screenHeight`).
  2. `setViewportSize({ width, height: 900 })` and wait until `uiState.screenWidth === width`.
  3. Take `layoutSignature`.
  4. Compare it with `expectedSignature(width, phase, selectedRound)`, a table built in Step 1 from fresh-page loads. There is no seam to load a game state into a second page, so the table stands in for "a fresh load at that width".
  5. Assert the state is unchanged, `assertNoHorizontalScroll` passes, and the selected round is still a valid button when the banner is visible.

- [ ] **Step 1: Build the `expectedSignature` table by measurement.** For each width in `[390, 640, 768, 1024, 1400, 1700, 2040, 2350, 2400]` and each phase where layout differs (selection with round 1 selected, play with round 2 selected), load fresh at that width and record `layoutSignature`. Commit the table with a comment saying how it was produced. Widths sit just above each breakpoint; also add `breakpoint - 1` widths for 1024 and 2350.
- [ ] **Step 2: Write "layout follows live resizes in every phase."** Start at 1440. In each phase (regular season mid-playback, Selection Sunday, picks, mid-tournament, recap), resize through the width list up, then down, calling `resizeAndCompare`. Then finish the game and check that the score and highlight checks still pass.
- [ ] **Step 3: Run.** Expected: pass.
- [ ] **Step 4: Sabotage.** Remove the `resize` listener in `App.tsx`. The resize test must fail at the first resize. Revert.
- [ ] **Step 5: Commit.** `test(e2e): live resize across breakpoints in every phase`

### Task 9: Login, logout, signed-in save (items 10, 11, 12 signed in)

**Files:**
- Create: `e2e/auth.spec.ts`
- Modify: `e2e/support/fakeAuth.ts`, `e2e/support/fakeBackend.ts`

**Interfaces:**
- Produces:
  - `FAKE_USER = { id: "00000000-0000-4000-8000-0000000000e2", email: "player@e2e.test" }`. `FAKE_PASSWORD = "correct-horse"`.
  - Route `POST /auth/v1/token?grant_type=password`. On the right credentials it returns a session body: `access_token` is an unsigned JWT with `sub` = user id, `exp` one hour ahead, `role: "authenticated"`; also `refresh_token`, `expires_in: 3600`, `expires_at`, `token_type: "bearer"`, `user`. Otherwise it returns 400 `{ error: "invalid_grant", error_description: "Invalid login credentials" }`.
  - Route `GET /auth/v1/user` → `FAKE_USER`, and `POST /auth/v1/logout` → 204.
  - `signInThroughUi(page, email, password)`: opens the `Login` dialog from the nav bar, fills the form, waits ≥ `MIN_FORM_FILL_TIME` (500 ms) using `expect.poll` on the form's enabled state, not a sleep, and submits.

- [ ] **Step 1: Write the tests:**
  - "wrong password shows an error and stays logged out": the error text renders in the dialog, and "Login" is still in the nav. Allowlist the `Error logging in` and `Form submission error` console errors for this test only.
  - "login shows the signed-in nav": the dialog closes, and "Dashboard" and "Logout" are visible.
  - "logout returns to logged out": "Login" is visible, and `goto("/dashboard")` ends at `/`.
  - "signed-in full game saves under the user id": two games back to back. `checkPersistPayload(..., FAKE_USER.id)` passes after each.
- [ ] **Step 2: Run.** Expected: pass. If the session isn't picked up after login, check the `@supabase/ssr` cookie name (`sb-127-auth-token` for this URL) and the server middleware's handling before changing approach.
- [ ] **Step 3: Sabotage.**
  - Make `NavigationBar` ignore `user`. The signed-in nav test must fail.
  - Make `TournamentPersist` always send `userId: null`. The signed-in save test must fail.
  - Revert both.
- [ ] **Step 4: Commit.** `test(e2e): login dialog, logout and signed-in save`

### Task 10: Dashboards (item 13)

**Files:**
- Create: `e2e/fixtures/dashboard.ts`, `e2e/dashboard.spec.ts`
- Modify: `e2e/support/fakeBackend.ts`

**Interfaces:**
- Produces:
  - Fixtures, each typed as the `Awaited<ReturnType<...>>` of the use case its route calls (read each `app/api/**/route.ts` to find it):
    - profile, user brackets, user statistics, pick count, team, conference;
    - every `useMadnessPrep` endpoint.
  - Two years' worth, with distinguishable values (e.g. a different top team name per year).
  - With `dashboard: true`, `installFakeBackend` serves them for `FAKE_USER.id` only and returns 403 for any other user id.

- [ ] **Step 1: Write `e2e/dashboard.spec.ts`** (`@mobile-too`), signed in via `signInThroughUi`:
  - "Your Stats" shows the 2025 fixture values: bracket chart rendered, user totals, top-picked team name.
  - "Madness Predictions" shows the 2025 lists.
  - Switching the year to 2024 shows the 2024 values in both tabs, and the 2024 endpoints were requested.
  - `assertNoHorizontalScroll` passes.
- [ ] **Step 2: Run.** Expected: pass on laptop and phone.
- [ ] **Step 3: Sabotage.** Make `useUserStatisticsByYearId` ignore `yearId` changes (a fixed query key). The year-switch assertion must fail. Revert.
- [ ] **Step 4: Commit.** `test(e2e): signed-in dashboards`

### Task 11: Docs, timing check, required check

**Files:**
- Create: `.claude/rules/e2e.md`
- Modify: `CLAUDE.md`, `docs/DIAGNOSIS.md`

- [ ] **Step 1: Write `.claude/rules/e2e.md`.** Frontmatter `paths: ["e2e/**", "playwright.config.ts"]`. It covers:
  - the fake backend (every `/api` call must be routed; fixtures typed from use cases);
  - the e2e-only store snapshot and its rule (expected values only, assertions from the screen);
  - tags and projects;
  - phase timeouts and how to re-measure them;
  - the console allowlist rule (each entry has a reason and a DIAGNOSIS finding);
  - the sabotage rule for new checks;
  - commands.
- [ ] **Step 2: Update `CLAUDE.md`.** Add `npm run e2e` / `npx playwright test` to Commands, plus a note that the first run builds the app. Add an E2E row to the rule index.
- [ ] **Step 3: Update `docs/DIAGNOSIS.md`.**
  - Step 7 row → Done (with a one-line summary).
  - New finding 43: "Low - A failed bracket save is silent: no `onError`, no `<Toaster>` mounted; pinned in `e2e/save-failure.spec.ts`. Fix in step 9."
  - A finding for each allowlisted console error, if any.
  - Any oddities the build turned up, with the step that will fix each.
- [ ] **Step 4: Run all verification.**
  - `npx vitest run`, `npm run lint` and `npx tsc --noEmit` must be green.
  - `npx playwright test --repeat-each 3` must be green on every run (a flake check, with zero failures allowed).
  - Push and confirm the CI `e2e` job passes in under 10 minutes.
- [ ] **Step 5: Commit.** `docs: e2e rule file, CLAUDE.md commands, DIAGNOSIS step 7`
- [ ] **Step 6: Required check.** Ask the owner to add "End-to-end tests" as a required status check on `main`, or do it with `gh api` only after explicit confirmation.
