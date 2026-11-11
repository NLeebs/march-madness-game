---
paths:
  - "e2e/**"
  - "playwright.config.ts"
---
# End-to-end tests (Playwright)

The suite in `e2e/` plays whole games in a real browser against a production build (`npm run build && next start -p 3100`, started by `playwright.config.ts`). Everything the app fetches from `/api` or Supabase auth is faked in the browser, so no test touches a database. CI runs it as the job "End-to-end tests".

## Commands

```bash
npm run e2e                                   # all projects (first run builds the app, ~30-40 s)
npx playwright test e2e/start.spec.ts         # one file
npx playwright test --project=laptop          # one project
npx playwright test --repeat-each 3           # flake check: zero failures allowed
npm run e2e:ui                                # Playwright UI mode
```

Full local run is ~4 min (the resize test alone is ~2.2 min).

**Stale server hazard.** `reuseExistingServer` is on locally, so a server left on port 3100 is reused even if the app code changed. Before running after changing app code, make sure nothing listens on 3100, and stop any server you started. (CI never reuses.)

## Fake backend

- `e2e/support/fakeBackend.ts` routes every `/api` call (plus Supabase auth via `fakeAuth.ts`). The `backend` fixture is automatic; options go through `test.use({ backendOptions })` (`persistStatus`, `teamStatsDelayMs`, `dashboard`).
- Any request that has no route is recorded in `backend.unhandled`, and the test fails. When the app gains an `/api` call, route it.
- Fixtures are typed from the use cases and route bodies (`getYears`, `PersistTournamentResult`, `SimulationRequestBody`), so response-shape drift fails `tsc`. League data is in `e2e/fixtures/league.ts`, dashboard data in `e2e/fixtures/dashboard.ts`.
- `NEXT_PUBLIC_BROWSER_ANON_KEY` (the localStorage key for the anonymous id) is set in the `webServer.env` of `playwright.config.ts`.

## The e2e-only store snapshot

- With `NEXT_PUBLIC_E2E=1` (set only by the Playwright web server; compiled out of normal builds), `src/utils/exposeStoreForE2e.ts` puts a read-only `getState` on `window.__MADNESS_E2E__`. Read it with `readState(page)` (`e2e/support/state.ts`).
- Rule: use it for **expected values only** (what the game says should be true: the schedule, the field, the picks tree). Assert from what is on screen. A test must never pass by reading the store back and comparing it with itself.
- There is no mid-tournament state to observe: the whole tournament simulation runs in one React commit (finding 50).

## Tags and projects

Tests are routed to viewport projects by tag in the title:

| Project | Viewport | Runs tests tagged |
|---|---|---|
| `phone` | 390x844, mobile, touch | `@every-size`, `@mobile-too` |
| `tablet` | 768x1024 | `@every-size` |
| `laptop` | 1440x900 | everything except `@wide` |
| `wide` | 2560x1440 | `@wide` |

An untagged test runs on laptop only. `@every-size` (a full game, navigation) runs on phone, tablet and laptop. `@mobile-too` adds phone only. `@wide` runs only at 2560.

## Driving the game

`GamePage` (fixture `game`, `e2e/support/game.ts`): `open`, `start`, `finishSeason`, `goToTournament`, `makePicks(seed, { beforeRound })`, `submitPicks`, `playTournament`, `openRecap`, `restart`. "Go to Tournament" bounces forever, so it is clicked via `assertClickable` + `dispatchEvent`. Test ids: `regular-season`, `bracket-column-<playin|1|2|sweet-sixteen|elite-eight|final-four|finals|champion>` (rounds 1 to final-four appear twice, top and bottom halves), `conference-group-<key>`, `round-select-banner`. Team buttons carry `data-round`, `data-region`, `data-matchup`, `data-team`, `data-seed`.

`e2e/support/bracketMap.ts` is a copy of `getNextRoundInfo` and the round constants; `tests/unit/e2e/bracketMap.test.ts` fails if it drifts from the app.

**Type-check constraint.** `next build` type-checks `e2e/` with the es5 target: no `for...of` over a `Map`/`Set` (use `Array.from`), and import `mulberry32` from `tests/game/helpers/mulberry32.ts`, not `rng.ts` (which pulls in vitest).

## Phase timeouts

- `PHASE_TIMEOUTS` in `e2e/support/timeouts.ts` bounds each phase of a game (toSeason, season, toSelection, picks, tournament, toStart). A phase over its bound fails with the phase named, long before the test's own limit.
- Bounds are 2.5x the slowest of 9 samples measured under load (6 games in parallel), with a 15 s floor for phases under ~3 s.
- **Re-measure** when the app gets slower or faster: temporarily log each phase's duration (wrap the phases in `GamePage`), run a full game on several projects in parallel, take the slowest per phase, multiply by 2.5, update the numbers and the date in the comment above `PHASE_TIMEOUTS`.
- Never use `waitForTimeout`; wait on a condition. Flakiness counts as a failure.

## Console errors

The `errors` fixture fails a test on any `console.error` or uncaught page error. Allow one with `errors.allow(pattern, reason)` in the test. Every entry needs a reason that names why it is expected **and**, where it records an app defect, a DIAGNOSIS finding (for example `save-failure.spec.ts`: "silent save failure, finding 43"). Keep patterns narrow, and where the message is generic (a bare "Failed to load resource") assert separately that only the intended request failed.

## Layout checks and KNOWN_LAYOUT_ISSUES

`e2e/support/layout.ts` has `assertNoHorizontalScroll`, `assertUsable`, `assertNoOverlap`, `assertRoundUnclipped` and `layoutSignature`, wrapped by `enforceLayout(page, phase, check, run)`.

`KNOWN_LAYOUT_ISSUES` lists layout defects the app has today. Where an entry matches the project, phase, check and (if given) width, the check **must fail**: the entry asserts the issue still occurs. When the issue is fixed the test fails with "known layout issue no longer occurs", which forces the entry's removal. Each entry has a `finding` text and a DIAGNOSIS finding number:

| Entry | Finding |
|---|---|
| laptop, bracket phases, 2349px: sideways scroll | 46 |
| phone, dashboard: sideways scroll (signed-in nav) | 48 |

Never add an entry to silence a new failure without logging a DIAGNOSIS finding for it.

## Live resize test (`resize.spec.ts`)

Laptop only. It sweeps widths in every phase and compares the layout against `EXPECTED_SIGNATURES`, the layout a fresh load shows at that width (there is no seam to load a state into a second page), and compares the full game state across the sweep.

- **`page.clock`**: the regular season resolves all its week timers at once and blocks the page for ~5 s (finding 45), so the test installs `page.clock`, pauses it, and advances with `runFor` to hold the season frozen while resizing, then resumes.
- Width 2350 exactly is skipped (finding 44).
- **Regenerating `EXPECTED_SIGNATURES`** (new breakpoint, layout change): run `E2E_MEASURE_SIGNATURES=1 npx playwright test e2e/resize.spec.ts` (laptop project). It opens a fresh page at each width, never resized, plays a game, and prints the table entry for each width (signature on Selection Sunday and with each round selected). Paste the output over the table and review the diff by eye: a changed row is a layout change someone must have intended.

## New checks: the sabotage rule

Every new check or helper that can fail must be seen to fail. Before committing, break the app (or the fixture) temporarily so the check should catch it, run the named test, confirm it fails for the stated reason, and revert. Never commit the sabotage; confirm `git diff` is clean of it. Positive controls (a test that the check passes on known-good input) are a good second line for layout checks.
