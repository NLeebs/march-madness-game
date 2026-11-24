---
paths:
  - "e2e/**"
  - "playwright.config.ts"
---
# End-to-end tests (Playwright)

The suite in `e2e/` plays whole games in a real browser against a production build served by `next start -p 3100` (started by `playwright.config.ts`). Everything the app fetches from `/api` or Supabase auth is faked in the browser, so no test touches a database. CI runs it as the job "End-to-end tests".

**Build.** The app is built with the e2e environment (`E2E_ENV` in `e2e/support/env.ts`, shared by the build and the web server) via `npm run e2e:build` (`scripts/e2e/build.mts`). Locally `playwright.config.ts` runs build + start itself. In CI (`process.env.CI`) it only runs `next start`: the workflow builds in its own step, with the Playwright browser cache and the `.next/cache` cache around it. Local builds read `.env`/`.env.local` while CI has none, so don't rely on local env values in prerendered routes.

## Commands

```bash
npm run e2e                                   # all projects (builds the app first, ~30-40 s)
npm run e2e:build                             # just the e2e build
npx playwright test e2e/start.spec.ts         # one file
npx playwright test --project=laptop          # one project
npx playwright test --repeat-each 3           # flake check: zero failures allowed
npm run e2e:ui                                # Playwright UI mode
```

Full run is ~5.8 min with 2 workers including the build (local 14-core machine); the resize test alone is ~2.2 min. Global limits: 120 s per test, 10 s per `expect` (tests that call `test.setTimeout` keep theirs).

**Stale server hazard.** `reuseExistingServer` is on locally, so a server left on port 3100 is reused even if the app code changed. Before running after changing app code, make sure nothing listens on 3100, and stop any server you started. (CI never reuses.)

## Fake backend

- `e2e/support/fakeBackend.ts` routes every `/api` call (plus Supabase auth via `fakeAuth.ts`). The `backend` fixture is automatic; options go through `test.use({ backendOptions })` (`persistStatus`, `seasonStatus`, `teamStatsDelayMs`, `dashboard`, `teamStats` to serve a different league, e.g. `e2eOneTeamConferenceStats`).
- Any request that has no route is recorded in `backend.unhandled`, and the test fails. When the app gains an `/api` call, route it.
- `POST /api/season` records the body in `backend.seasonRequests` and plays the season like the route: `compactSeason(simulateSeason(teamStats))` plus `yearId` and a `fieldToken` from `signFieldToken` with `E2E_SIGNING_SECRET` (`e2e/support/env.ts`, a fixed fake secret: the fake runs in the Playwright process, so it never reads process env). The token field mirrors `PlaySeason` (`selection.field`, 11- and 16-seed play-ins). A `seasonStatus` >= 400 answers an `apiError` body (`season-failure.spec.ts` checks the crash screen). A league the engine rejects (`crash.spec.ts`'s one-team conference) makes the fake answer 500 with the engine's message, like the route.
- `POST /api/bracket/simulation` records the body in `backend.persistRequests`. A `persistStatus` >= 400 answers that status with a `handleApiError`-shaped body (`apiError` in `e2e/support/simulationRequest.ts`). Otherwise `checkSimulationRequest` validates the body like the route and use case do (strict `SimulationRequestSchema` with `{ fieldToken, picks, anonUserId? }`, the token verified with `E2E_SIGNING_SECRET` (bad token: 400 `FIELD_TOKEN_INVALID`) and year and field taken from it, every field team in the served league, `validateBracketPicks` against the round one rebuilt with `seedTournament` + `buildRoundOneMatchups`) and answers 400 in the same shape on failure, so the body the real UI builds must pass the real validation. A valid body is played like the route: `simulateTournament` on the token's field and the posted picks with the league it served and `ROUND_POINTS`, returning `playin`, `rounds`, `roundPoints`, `score` and `bracketId: "e2e-bracket"` (201). Import game functions by module path (`src/functions/tournament/...`), never the `@/src/functions` barrel. Year ids in the fixtures are UUIDs because the schema requires one.
- `checkPersistPayload` (`e2e/checks/results.ts`) checks the one request: no `userId`, `field` or `yearId` key (the server reads the session; year and field are in the token), `anonUserId` null when signed in and the stored id when anonymous, a token whose field is 60 + 4 + 4, and every pick as made (play-in placeholders not replaced).
- Fixtures are typed from the use cases and route bodies (`getYears`, `PlayTournamentResult`, `SimulationRequestBody` from `app/api/bracket/simulation/schema.ts`), so response-shape drift fails `tsc`. League data is in `e2e/fixtures/league.ts`, dashboard data in `e2e/fixtures/dashboard.ts`.
- `NEXT_PUBLIC_BROWSER_ANON_KEY` (the localStorage key for the anonymous id) is set in the `webServer.env` of `playwright.config.ts`.

## The e2e-only store snapshot

- With `NEXT_PUBLIC_E2E=1` (set only by the Playwright web server; compiled out of normal builds), `src/utils/exposeStoreForE2e.ts` puts a read-only `getState` on `window.__MADNESS_E2E__`. Read it with `readState(page)` (`e2e/support/state.ts`).
- Rule: use it for **expected values only** (what the game says should be true: the schedule, the field, the picks tree). Assert from what is on screen. A test must never pass by reading the store back and comparing it with itself.
- There is no mid-tournament state to observe: the server plays the whole tournament in one request and the browser replays the result. The only state between picks and results is the bracket with that request pending (`appState.tournamentSelection`, button "Tipping off..."); the reload test in `game-flow.spec.ts` holds the request open there.

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
- Bounds are ~2.5x the slowest of 9 samples measured under load (6 games in parallel), with a 15 s floor for phases under ~3 s. The exception is `picks`, a deliberately generous 150 s stall detector (each click has its own 15 s limit). `GAME_BUDGET_MS` is the sum of all bounds plus the pick-action budget, for `test.setTimeout`.
- **Re-measure** when the app gets slower or faster: temporarily log each phase's duration (wrap the phases in `GamePage`), run a full game on several projects in parallel, take the slowest per phase, multiply by 2.5, update the numbers and the date in the comment above `PHASE_TIMEOUTS`.
- Never use `waitForTimeout`; wait on a condition. Flakiness counts as a failure.

## Console errors

The `errors` fixture fails a test on any `console.error` or uncaught page error. Allow one with `errors.allow(pattern, reason)` in the test. Every entry needs a reason that names why it is expected **and**, where it records an app defect, a DIAGNOSIS finding (for example `tournament-failure.spec.ts`: "failed tournament request shows crash screen", for the 500 and for React logging the error the boundary caught; `crash.spec.ts`: "forced crash to test the error boundary"). Keep patterns narrow, and where the message is generic (a bare "Failed to load resource") assert separately that only the intended request failed.

## Layout checks and KNOWN_LAYOUT_ISSUES

`e2e/support/layout.ts` has `assertNoHorizontalScroll`, `assertUsable`, `assertNoOverlap`, `assertRoundUnclipped` and `layoutSignature`, wrapped by `enforceLayout(page, phase, check, run)`. `assertNoHorizontalScroll` checks the page and the narrow bracket's own scroll box (`bracket-scroll`). Widths below the phone project's 390px are covered by `test.use({ viewport })` (e.g. the 360/375px signed-in nav checks in `auth.spec.ts`, which skip themselves outside the phone project so the laptop project doesn't repeat them at the same width).

**Linux text is wider.** CI runs Chromium on Linux, which rounds text widths up to whole pixels (e.g. the Dashboard button is 104px on Linux, 102.11px on Windows), so a row that fits on Windows by a pixel or two scrolls sideways in CI. Leave a few pixels of room in tight layouts, and check a near-fit on Linux before pushing: `docker run -d --name pw --ipc=host -w /work mcr.microsoft.com/playwright:v1.56.1-noble sleep infinity` (version = `@playwright/test`), copy in `git archive HEAD`, then `npm ci` and `npx playwright test <file> --project=<project>` inside it. In Git Bash set `MSYS_NO_PATHCONV=1` so `/work` isn't rewritten.

`KNOWN_LAYOUT_ISSUES` lists layout defects the app has today. Where an entry matches the project, phase, check and (if given) `widths`, the check **must fail**: the entry asserts the issue still occurs. When the issue is fixed the test fails with "known layout issue no longer occurs", which forces the entry's removal. Each entry has a `finding` text and a DIAGNOSIS finding number:

None today (findings 46 and 48 were fixed in step 10c).

Never add an entry to silence a new failure without logging a DIAGNOSIS finding for it.

## Live resize test (`resize.spec.ts`)

Laptop only. It sweeps widths in every phase and compares the layout against `EXPECTED_SIGNATURES`, the layout a fresh load shows at that width (there is no seam to load a state into a second page), and compares the full game state across the sweep.

- **`page.clock`**: the regular season plays a week every 0.15 s, and the full-state comparison needs a season that doesn't move, so the test installs `page.clock`, pauses it, and advances with `runFor` to hold the season frozen while resizing, then resumes.
- Width 2350 (`TOURNAMENT_BREAK_POINT`) is swept: since step 10b it takes the narrow layout, like 2349 (finding 44).
- Width 2326 is swept: the first width where the old centred `max-w-tourny` wrapper overhung (finding 46).
- After the "played" sweep (which leaves round 1 selected) the test checks See Recap and Play Again are usable with round 1 selected (finding 47).
- **Regenerating `EXPECTED_SIGNATURES`** (new breakpoint, layout change): run `E2E_MEASURE_SIGNATURES=1 npx playwright test e2e/resize.spec.ts` (laptop project). It opens a fresh page at each width, never resized, plays a game, and prints the table entry for each width (signature on Selection Sunday and with each round selected). Paste the output over the table and review the diff by eye: a changed row is a layout change someone must have intended.

## New checks: the sabotage rule

Every new check or helper that can fail must be seen to fail. Before committing, break the app (or the fixture) temporarily so the check should catch it, run the named test, confirm it fails for the stated reason, and revert. Never commit the sabotage; confirm `git diff` is clean of it. Positive controls (a test that the check passes on known-good input) are a good second line for layout checks.
