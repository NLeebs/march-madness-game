# Error Boundary + Sentry Crash Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blank page on a crash with a "Something went wrong" screen that sends the player home, and report every crash (with game context and bad-data details) to Sentry, which emails the developer.

**Architecture:** A `GameDataError` carries structured details from game logic. A small `src/utils/crashReporting/` module turns an error plus context into one Sentry event and never throws. Three boundaries render a shared `CrashScreen`: a game boundary in `app/page.tsx` (inside the Redux `Provider`), `app/error.tsx` and `app/global-error.tsx`. The Sentry SDK only initializes when `NEXT_PUBLIC_SENTRY_DSN` is set.

**Tech Stack:** Next.js 14 App Router, React 18, Redux Toolkit, `@sentry/nextjs`, vitest + Testing Library (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-error-boundary-sentry-design.md`

## Global Constraints

- Work on branch `refactor/step8b-season` (lands with PR #17). Conventional commits; end each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Fallback copy, exact: heading `Something went wrong`, body `Sorry about that. We've been notified and will look into it.` Buttons: `Start a new game` (game boundary), `Back to home` (`app/error.tsx`, `app/global-error.tsx`). No raw error text or stack on screen.
- The button does `window.location.assign("/")`. Never dispatch into the store from a fallback.
- Sentry: initialize only when `NEXT_PUBLIC_SENTRY_DSN` is non-empty; `sendDefaultPii: false`; `tracesSampleRate: 0`; no replay integration; `environment` from `process.env.VERCEL_ENV ?? process.env.NODE_ENV`.
- Never send emails or the whole Redux store to Sentry. Ids only (user id via `scope.setUser({ id })`, anon id as tag `anon_user_id`).
- Crash reporting must never throw: anything that fails while gathering context or reporting is swallowed (the fallback must still render).
- Never call `getAnonUserId()` from crash code. Read `localStorage.getItem(process.env.NEXT_PUBLIC_BROWSER_ANON_KEY)` inside try/catch; omit when missing.
- `npm run build`, `npx tsc --noEmit`, `npm run lint`, `npx vitest run` must pass with no Sentry env vars set. Builds must not fail when `SENTRY_AUTH_TOKEN` is absent.
- Game-engine pins in `tests/game/` must not change (`.claude/rules/game-engine.md`).
- No new `any`. Export new modules from their barrel `index.ts`.

## Review Focus

1. **Context gathering throws** (store getter throws, `localStorage` blocked, anon key env unset) -> the fallback still renders and the error is still reported with whatever context was gathered. Tests in Task 2 and Task 3.
2. **A non-`Error` is thrown** (a string, `undefined`) -> reported without crashing the reporter; fallback renders. Test in Task 2.
3. **Sentry itself throws or is uninitialized** (no DSN) -> `reportCrash` swallows it; nothing reaches the player. Test in Task 2.
4. **The crash is in `NavigationBar`**, not `App` -> the game boundary still catches it (boundary wraps both). Test in Task 3.
5. **Build without any Sentry env vars** (CI, local, e2e) -> build succeeds, no network calls to Sentry. Verified in Task 5 and by the e2e run in Task 6.

---

### Task 1: `GameDataError` and structured validation errors

**Files:**
- Create: `src/functions/generic/GameDataError.ts`
- Modify: `src/functions/generic/index.ts` (export it)
- Modify: `src/functions/regularSeason/selectTournamentField.ts` (`validateInputs`, the three throws)
- Test: `tests/unit/functions/selectTournamentField.test.ts` (extend the existing validation tests)

**Interfaces:**
- Produces: `class GameDataError extends Error { readonly details: Record<string, unknown>; constructor(message: string, details: Record<string, unknown>) }` with `name = "GameDataError"`. Exported from `@/src/functions`.

- [ ] **Step 1: Write the failing tests.** In the existing validation `describe`, for each of the three cases assert the thrown value is a `GameDataError` with the same message as today and these `details`:
  - one-team conference: `toEqual({ conference: "<name>", teamCount: 1 })`
  - team without a record: `toEqual({ team: "<team>", conference: "<conf>" })`
  - too few non-champions: `toEqual({ nonChampions: <n>, atLargeSpots: NUMBER_OF_AT_LARGE_TEAMS })`

  Use `try/catch` + `expect(err).toBeInstanceOf(GameDataError)` + `expect((err as GameDataError).details)...`, and keep the existing message assertions.
- [ ] **Step 2:** Run `npx vitest run tests/unit/functions/selectTournamentField.test.ts`. Expected: FAIL (import missing, then not instance of `GameDataError`).
- [ ] **Step 3:** Create `GameDataError` (set `this.name`, and `Object.setPrototypeOf(this, GameDataError.prototype)` so `instanceof` survives transpilation), export it, and switch the three throws in `validateInputs` to `new GameDataError(<same message>, <details>)`.
- [ ] **Step 4:** Run the same file, then `npx vitest run tests/game`. Expected: PASS, no pin changes.
- [ ] **Step 5:** Commit `feat(selection): throw GameDataError with details from selectTournamentField`. Include the spec and this plan (`docs/superpowers/specs/2026-11-12-error-boundary-sentry-design.md`, `docs/superpowers/plans/2026-11-12-error-boundary-sentry.md`) in this commit.

---

### Task 2: Crash reporting module

**Files:**
- Modify: `package.json` / `package-lock.json` (`npm install @sentry/nextjs` - latest version whose peer range includes `next@14`)
- Create: `src/utils/crashReporting/gameCrashContext.ts`, `src/utils/crashReporting/reportCrash.ts`, `src/utils/crashReporting/readAnonUserId.ts`, `src/utils/crashReporting/index.ts`
- Modify: `src/utils/index.ts` (export `./crashReporting`)
- Test: `tests/unit/utils/crashReporting.test.ts`

**Interfaces:**
- Consumes: `GameDataError` from `@/src/functions` (Task 1); `RootState` from `@/store/store`.
- Produces:
  ```ts
  export type GameCrashContext = {
    activeFlags: string[];            // names of appState keys that are true, in key order
    tournamentRound: TournamentRound | null; // uiState.selectedRound when appState.tournament, else null
    yearId: string;                   // tournament.yearId
    teamCount: number;                // total teams across teamStats.conferenceArrays
    weeksPlayed: number;              // regularSeasonRecords.weeksPlayed
  };
  export type CrashBoundary = "game" | "route" | "global";
  export type CrashContext = {
    boundary: CrashBoundary;
    game?: GameCrashContext;
    userId?: string;
    anonUserId?: string;
  };
  export function summarizeGameState(state: RootState): GameCrashContext;
  export function readAnonUserId(): string | undefined;
  export function reportCrash(error: unknown, context: CrashContext): void;
  ```

- [ ] **Step 1: Write the failing tests** (`vi.mock("@sentry/nextjs", ...)` with `withScope: vi.fn((cb) => cb(scope))`, `captureException: vi.fn()`, and a fake `scope` whose `setTag`, `setContext`, `setUser` are `vi.fn()`):
  - `summarizeGameState` on `createAppStore().getState()` returns `{ activeFlags: ["startScreen", "loading"], tournamentRound: null, yearId: "", teamCount: 0, weeksPlayed: 0 }`.
  - `summarizeGameState` on a store preloaded with `appState.tournament = true`, `uiState.selectedRound = "sweet sixteen"`, `tournament.yearId = "y1"`, and `teamStats.conferenceArrays` from `buildLeague()` (`tests/factories/league.factory.ts`) returns `tournamentRound: "sweet sixteen"`, `yearId: "y1"`, and `teamCount` equal to the league's team count.
  - `reportCrash(new GameDataError("m", { team: "A" }), { boundary: "game", game, userId: "u1" })` calls `setTag("boundary", "game")`, `setContext("game", game)`, `setContext("gameData", { team: "A" })`, `setUser({ id: "u1" })`, then `captureException` with the error.
  - with `anonUserId: "anon-1"` and no `userId`: `setTag("anon_user_id", "anon-1")`, `setUser` not called.
  - a plain `Error` does not call `setContext("gameData", ...)`.
  - `reportCrash("boom", { boundary: "route" })` calls `captureException("boom")` and does not throw.
  - when `captureException` throws, `reportCrash` does not throw.
  - `readAnonUserId()` returns the stored value when `NEXT_PUBLIC_BROWSER_ANON_KEY` is stubbed and the key is set; returns `undefined` (and writes nothing to `localStorage`) when the key is missing, when the env var is unset, and when `localStorage.getItem` throws.
- [ ] **Step 2:** Run `npx vitest run tests/unit/utils/crashReporting.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Install `@sentry/nextjs`; implement the three functions. `reportCrash` wraps everything in `try/catch` and uses `Sentry.withScope`. `summarizeGameState` is pure.
- [ ] **Step 4:** Run the file. Expected: PASS. Run `npx tsc --noEmit`. Expected: only the 2 known CSS-module errors (or none if `next-env.d.ts` exists).
- [ ] **Step 5:** Commit `feat(errors): add crash reporting helpers for Sentry`.

---

### Task 3: Crash screen and the game boundary

**Files:**
- Create: `src/components/General/CrashScreen.tsx`, `src/components/General/GameErrorBoundary.tsx`
- Modify: `src/components/General/index.ts` (export both)
- Modify: `app/page.tsx` (wrap `<NavigationBar />` and `<App />` in `<GameErrorBoundary>` inside `<Provider>`)
- Test: `src/components/General/__tests__/CrashScreen.test.tsx`, `src/components/General/__tests__/GameErrorBoundary.test.tsx`

**Interfaces:**
- Consumes: `reportCrash`, `summarizeGameState`, `readAnonUserId`, `CrashContext` (Task 2); `useAuth` from `@/src/hooks`; `Button` from `@/src/components` and `PRIMARY_COLOR` from `@/src/constants`.
- Produces:
  - `CrashScreen: React.FC<{ buttonText: string }>` - heading + body copy from Global Constraints, a `Button` that calls `window.location.assign("/")`. Self-contained styling (no reliance on layout classes) so `global-error.tsx` can use it.
  - `GameErrorBoundary: React.FC<{ children: React.ReactNode }>` - a function component that reads `useStore()` (react-redux) and `useAuth()`, builds a `getContext: () => CrashContext` getter (`boundary: "game"`, `game: summarizeGameState(store.getState())`, `userId: user?.id`, `anonUserId: readAnonUserId()`), and renders a private class boundary (`getDerivedStateFromError` + `componentDidCatch`) with it. `componentDidCatch` calls `getContext()` inside try/catch (falls back to `{ boundary: "game" }`) then `reportCrash`. Fallback: `<CrashScreen buttonText="Start a new game" />`.

- [ ] **Step 1: Write the failing tests.**
  - `CrashScreen`: renders the exact heading and body; the button shows `buttonText`; clicking calls `window.location.assign` with `"/"` (stub via `vi.stubGlobal` or `Object.defineProperty(window, "location", ...)`).
  - `GameErrorBoundary` (render inside a real `Provider` with `createAppStore()` and `AuthContext.Provider value={{ user: { id: "u1" }, loading: false }}`; mock `@/src/utils/crashReporting`'s `reportCrash`):
    - a child that throws during render -> `Something went wrong` and a `Start a new game` button are shown; `reportCrash` called once with the error and `expect.objectContaining({ boundary: "game", userId: "u1", game: expect.objectContaining({ activeFlags: expect.arrayContaining(["startScreen"]) }) })`.
    - a child that throws in `useEffect` -> fallback shown, `reportCrash` called.
    - two siblings, the first (stand-in for `NavigationBar`) throws -> fallback shown.
    - when `summarizeGameState` throws (spy) -> fallback still shown and `reportCrash` called with `{ boundary: "game" }`.
    - a child that does not throw renders normally and `reportCrash` is not called.
  - Silence React's expected `console.error` in these tests with a scoped `vi.spyOn(console, "error").mockImplementation(() => {})`.
- [ ] **Step 2:** Run `npx vitest run src/components/General/__tests__/CrashScreen.test.tsx src/components/General/__tests__/GameErrorBoundary.test.tsx`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement both components and wrap the game in `app/page.tsx`.
- [ ] **Step 4:** Run the two files, then `npx vitest run`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat(errors): show a crash screen and report game crashes`.

---

### Task 4: Route and global error pages

**Files:**
- Create: `app/error.tsx`, `app/global-error.tsx`
- Test: `tests/unit/app/errorPages.test.tsx`

**Interfaces:**
- Consumes: `CrashScreen` (Task 3); `reportCrash`, `readAnonUserId` (Task 2); `AuthContext` from `@/src/components/Context/AuthProvider`.
- Produces: Next.js conventions, both `"use client"`, default export with props `{ error: Error & { digest?: string }; reset: () => void }` (`reset` unused).
  - `app/error.tsx`: in `useEffect([error])`, `reportCrash(error, { boundary: "route", userId, anonUserId: readAnonUserId() })`, where `userId` comes from `useContext(AuthContext)?.user?.id` (not `useAuth()`, which throws when the context is missing). Renders `<CrashScreen buttonText="Back to home" />`.
  - `app/global-error.tsx`: renders `<html lang="en"><body>...<CrashScreen buttonText="Back to home" /></body></html>`; `useEffect` reports with `{ boundary: "global", anonUserId: readAnonUserId() }`. Imports `./globals.css` so Tailwind styles apply.
  - When `error.digest` is set, add it as a tag `digest` (pass through `CrashContext` - extend `CrashContext` with optional `digest?: string`, set by `reportCrash` via `setTag("digest", digest)`; add one assertion for it to Task 2's test file in this task).

- [ ] **Step 1: Write the failing tests.** For each page: renders the heading and a `Back to home` button; calls `reportCrash` once with the error and the right `boundary`; `app/error.tsx` passes `userId` when rendered inside `AuthContext.Provider` and works (no throw, no `userId`) without one; `digest` is passed through.
- [ ] **Step 2:** Run `npx vitest run tests/unit/app/errorPages.test.tsx tests/unit/utils/crashReporting.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement both pages and the `digest` field.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat(errors): add route and global error pages`.

---

### Task 5: Sentry SDK wiring

**Files:**
- Create: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts` (follow the installed SDK version's Next.js 14 manual-setup docs; Next 14 uses `sentry.client.config.ts`, not `instrumentation-client.ts`)
- Modify: `next.config.js` (wrap with `withSentryConfig`), `middleware.ts` (matcher excludes `monitoring`)
- Modify: `.gitignore` if the SDK suggests `.env.sentry-build-plugin`
- Test: `tests/unit/middlewareMatcher.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks at runtime (the SDK's global client is what `reportCrash` talks to).
- Produces: each config calls `Sentry.init({ dsn, enabled: !!dsn, sendDefaultPii: false, tracesSampleRate: 0, environment })` only when `dsn = process.env.NEXT_PUBLIC_SENTRY_DSN` is non-empty. `withSentryConfig(nextConfig, { org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, authToken: process.env.SENTRY_AUTH_TOKEN, silent: !process.env.CI, tunnelRoute: "/monitoring", widenClientFileUpload: true, disableLogger: true })`. Keep the existing `env.NEXT_PUBLIC_E2E` and `reactStrictMode` settings.

- [ ] **Step 1: Write the failing test.** Import `config` from `@/middleware` and assert that its matcher regex (build it as Next does: `new RegExp("^" + pattern + "$")` on the single matcher string) does **not** match `/monitoring` or `/monitoring?o=1&p=2`, and still matches `/` and `/dashboard`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/middlewareMatcher.test.ts`. Expected: FAIL on `/monitoring`.
- [ ] **Step 3:** Add `monitoring` to the matcher's negative lookahead; add the Sentry configs and `withSentryConfig`.
- [ ] **Step 4:** Verify, all with no Sentry env vars set:
  - `npx vitest run tests/unit/middlewareMatcher.test.ts` -> PASS
  - `npm run build` -> succeeds (a "no auth token, skipping source map upload" warning is fine)
  - `npx tsc --noEmit` and `npm run lint` -> clean
  - `npx vitest run` -> all PASS
- [ ] **Step 5:** Commit `feat(errors): wire Sentry SDK, off unless NEXT_PUBLIC_SENTRY_DSN is set`.

---

### Task 6: E2E crash spec

**Files:**
- Modify: `e2e/support/fakeBackend.ts` (new option)
- Modify: `e2e/fixtures/league.ts` (a broken-league helper)
- Create: `e2e/crash.spec.ts`

**Interfaces:**
- Consumes: `GamePage` (`e2e/support/game.ts`), the `errors` fixture, `installFakeBackend` options via `test.use({ backendOptions })`.
- Produces: `FakeBackendOptions.teamStats?: (yearId: string) => ConferenceMap` (overrides `e2eTeamStats` when set); `e2eOneTeamConferenceStats(yearId: string): ConferenceMap` = `e2eTeamStats(yearId)` with `conf01` cut to its first team.

- [ ] **Step 1: Write the spec.** `test.use({ backendOptions: { teamStats: e2eOneTeamConferenceStats } })`. Allow the expected console error with `errors.allow(/Conference "conf01" has 1 team/, "forced crash to test the error boundary (step 8b)")` plus any narrow React "above error occurred" pattern the run shows. Steps: `game.open()`, `game.start()`, `game.finishSeason()`, then click through to Selection Sunday the way `goToTournament` does up to the point it would wait for the bracket. Assert `Something went wrong` and a `Start a new game` button are visible. Click it; assert the start screen is back (whatever `game.open()` waits for). If the crash happens before Selection Sunday, stop and report it rather than changing the trigger: that is a new finding.
- [ ] **Step 2:** Run `npx playwright test e2e/crash.spec.ts`. Expected: FAIL before the option exists, then PASS after Step 3.
- [ ] **Step 3:** Add the option and the fixture helper.
- [ ] **Step 4:** Run the full suite `npm run e2e`. Expected: all PASS (~4 min).
- [ ] **Step 5:** Commit `test(e2e): crash at Selection Sunday shows the crash screen`.

---

### Task 7: Docs

**Files:**
- Modify: `CLAUDE.md`, `docs/DIAGNOSIS.md`, `.claude/rules/e2e.md`

- [ ] **Step 1: `CLAUDE.md`.** Environment: add `NEXT_PUBLIC_SENTRY_DSN` (optional; unset = Sentry off, as in dev/CI/e2e) and `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (Vercel build env only, for source maps). Architecture: one bullet under "Two kinds of state" or a new short "Crashes" subsection: game boundary in `app/page.tsx`, `app/error.tsx`, `app/global-error.tsx` render `CrashScreen` and report through `src/utils/crashReporting` to Sentry; throw `GameDataError` with `details` for bad game data.
- [ ] **Step 2: `docs/DIAGNOSIS.md`.** Add finding 53 under a new "#### Found in the step 8b code review" heading: "No error boundary; any render/effect throw blanks the app (8b's `selectTournamentField` validation made bad data hit it). **Fixed in step 8b:** crash screens + Sentry reports (spec `docs/superpowers/specs/2026-11-12-error-boundary-sentry-design.md`)." Update finding 39's "Fixed" note to say the throws are `GameDataError`s caught by the game boundary. Step 8 roadmap row: mention the error boundary and Sentry. Leave "Left for later" items from the spec as a line under the finding.
- [ ] **Step 3: `.claude/rules/e2e.md`.** Under "Console errors", add `crash.spec.ts` as the second example allowlist ("forced crash to test the error boundary") and note the `teamStats` fake-backend option.
- [ ] **Step 4:** Run `npx vitest run`, `npm run lint`, `npx tsc --noEmit`. Expected: clean.
- [ ] **Step 5:** Commit `docs: error boundary, Sentry setup and finding 53`.
