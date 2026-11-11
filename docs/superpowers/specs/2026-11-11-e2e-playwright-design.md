# Step 7: Playwright end-to-end tests - design

Date: 2026-11-11. Roadmap step 7 in `docs/DIAGNOSIS.md`.

## Intent

Step 10 breaks up the big UI components (`Tournament.tsx`, `TournamentRound`, `RoundSelectButton`, `PlayTournamentGames`), and later steps change the reducers and app state. The step 6 tests check the game logic in isolation (in jsdom, with Redux). They don't check that the real app, in a real browser, shows that logic correctly, moves from one phase to the next, works at every screen size, or handles login and the dashboards. This step adds Playwright tests that play the game the way a person does and fail on the kinds of breakage the owner checks by eye after a change.

Success: a UI refactor that breaks any behaviour below fails CI on the PR, with a trace that shows where.

## What the tests must catch

In the owner's words, a refactor shouldn't produce any of these:

1. **Error messages.** Fail on any error toast, the error screen/boundary, an uncaught page error, or a browser console error (see the allowlist under Constraints).
2. **Stalls between phases.** Start -> regular season -> Selection Sunday -> picks -> tournament (play-ins, then rounds) -> recap. Each change has a time limit, so a stall fails quickly instead of hitting the global timeout.
3. **Teams playing the wrong number of regular-season games.** Every team's schedule on screen has the expected count.
4. **The wrong conference champion.** Each champion shown has the best conference record among its conference's teams, using the records on screen. Ties follow the current rule (finding 37: key order). Where the screen can't settle a tie, the check accepts any of the tied teams.
5. **A pick going to the wrong next round.** Clicking a team puts it in the correct slot of the next round. Changing an earlier pick clears that team from later rounds (the cascade).
6. **Wrong highlights and scores in the tournament.** After games are played, the correct and incorrect marks on picks match the real winners. The running player score equals the sum, over correctly picked games, of the round's points (10/20/40/80/160/320 today, read from the same source the app uses).
7. **Tournament navigation.** The round banner, the round-select buttons and the back button go to the intended round and show its matchups.
8. **Reset.** "Restart" from the recap returns to the start screen with clean state. A second game then plays to the end with no leftovers: no old picks, records, score or seeds.
9. **Winner dialog.** The recap dialog opens at the end, names the actual champion, and shows the same score as the running score.
10. **Login dialog.** Open it from the nav bar, see an error for bad credentials, sign in, and see the signed-in nav state (dashboard link, logout).
11. **Logout.** Sign out and you're logged out. Visiting `/dashboard` logged out sends you back to `/`.
12. **Saving the bracket.** The `POST /api/bracket/simulation` the app sends at the end contains picks that match what was picked on screen. It uses the user's ID when signed in and the anonymous ID when not. A failed save (the fake returns 500) doesn't crash or stall the game: the recap and restart still work. Today a failed save is silent (no `onError`, no `<Toaster>` mounted). That's logged as a new DIAGNOSIS finding and slated for step 9, and the test pins today's behaviour. *(Owner's call, 2026-11-11: option b.)*
13. **Dashboards (signed in).** `/dashboard` shows both tabs ("Your Stats", "Madness Prep") filled from the fake data. Switching years refetches and re-renders. Both tabs work at phone and laptop widths.

### Responsiveness

"Playable on all screens, and it responds correctly if the window resizes at any point."

- **Every size is playable.** Full games run at phone (390x844), tablet (768x1024) and laptop (1440x900) sizes, plus at least the tournament phase at a very wide size (2560x1440, above `TOURNAMENT_BREAK_POINT` = 2350). At each size:
  - every control the game needs is visible, inside the viewport (after scrolling it into view) and clickable;
  - the page has no horizontal scroll;
  - bracket matchups aren't clipped and don't overlap each other (bounding-box checks).
- **Wide screens show the full bracket.** Above 2350px the whole bracket shows and the round banner is hidden. Below 2350px the banner shows and you move between rounds.
- **Live resize.** In one game, resize during each phase (regular season, Selection Sunday, picks, mid-tournament, recap), crossing the breakpoints in both directions (`constants`: 640, 768, 1024, 1400, 1700, 2040, 2350). After each resize the layout has to match a fresh load at that width: visible bracket columns, banner shown or hidden, the selected round valid. Game state must not change: picks, score, current round and records stay the same.

These are measured checks, not screenshot comparisons. Results are random, so screenshots would differ every run.

## Goals, non-goals, anti-goals

**Goals:** everything above runs in CI on every PR and on `main` as its own job, and becomes a required check.

**Non-goals:**
- The API routes, repositories and database aren't exercised. Integration tests (`tests/integration`) and pgTAP already cover them.
- Exact game results aren't pinned. Step 6's draw-order pins do that.
- Pixel or visual regression testing.
- Browsers other than Chromium (maybe later).
- Fixing bugs the tests find. Log them in `docs/DIAGNOSIS.md` as new findings and pin current behaviour unless the owner decides otherwise, as step 6 did.

**Anti-goals (a failure even if it technically works):**
- **Flaky tests.** A test that sometimes fails on a correct app teaches people to rerun until green. CI runs with `retries: 0`. Waits are on conditions (Playwright auto-waiting, `expect.poll`, `toBeVisible`), never fixed sleeps.
- **Tests that pass while the app is broken.** Each check has to be able to fail. During the build, briefly break each target (for example, make a pick land in the wrong slot) and confirm the matching test goes red. This is the e2e equivalent of "watch it fail".
- **Hidden cost or secrets.** No real Supabase, Firebase or Vercel calls from CI, and no new secrets. The app stays on the free plan.
- **A slow job.** Target: the E2E job finishes in under 10 minutes wall-clock in CI.
- **Product code bent to suit the tests.** Product changes are limited to adding `data-testid` or accessible names where a role or text locator isn't enough, and they don't change behaviour.

## Constraints

- Next.js 14 App Router, `reactStrictMode: false`, Tailwind, framer-motion. Real game timings: 0.5 s per regular-season week (about 15 s per season), 1 s between app states.
- Picks must not be pre-filled: run with `NEXT_PUBLIC_APP_MODE` unset (not `dev`).
- Team stats are served from Firebase today (`TeamStatsRepository`). The owner plans to move them to Supabase. Faking at the `/api` boundary means that move shouldn't need test changes beyond fixture shape.
- The middleware (`utils/supabase/refreshSupabaseSession.ts`) calls `supabase.auth.getUser()` server-side on every request. That call can't be intercepted by Playwright. With a fake `NEXT_PUBLIC_SUPABASE_URL` it must fail fast and harmlessly, not hang each request.
- **Console allowlist:** console errors the app already emits today may go on a short, commented allowlist, each with a reason. Each one is also logged as a DIAGNOSIS finding. Anything not on the list fails the test.
- Follow the repo conventions: TypeScript with no new `any`, factories in `tests/factories/`, conventional commits, branch + PR, and docs in the same PR (no docs-only PRs).

## Decided

| Decision | Choice | Whose call |
|---|---|---|
| Scope | Items 1-13 plus responsiveness, above | Owner |
| Backend | Everything faked in the browser with `page.route`: all `/api/**` calls and all Supabase auth calls (`<SUPABASE_URL>/auth/v1/**`), including a fake signed-in session | Mine (the owner agreed the approach) |
| Fixture data | Built from step 6's `buildLeague()` (360 teams, 31 conferences), shaped like the real responses. Typed against the use-case return types / `models` so `tsc` fails if an API changes shape | Mine |
| Assertions | Self-consistency rules read from the screen, not pinned results | Mine (the owner agreed) |
| Viewports | 390x844, 768x1024, 1440x900 full games; 2560x1440 at least for the tournament; one resize-walk game | Mine |
| Browser | Chromium only | Mine |
| Server | Production build (`next build && next start`) via Playwright `webServer` | Mine |
| CI | New `e2e` job in `.github/workflows/ci.yml`, separate from `check`. Uploads the Playwright HTML report and traces on failure. Made a required check on `main` (branch protection is changed by the owner, or by Claude with explicit confirmation) | Mine |
| Retries | 0 in CI and locally | Mine |

## Settled after the builder check

- **Scoring points source.** The app scores with constants hard-coded in `store/tournamentSlice.ts` `comparePicksAndGames` (finding 6), not the `/api/tournament-scoring-rules` data. Export those values as a named constant with no behaviour change, and have the test read them from there. Don't copy the numbers into the test. *(My call.)*
- **Conference champion check runs at laptop width and up.** Below `lg`, `ConferenceGroups.tsx` hides the smaller conferences, so at phone and tablet sizes the check covers only the conferences that are shown. *(My call.)*
- **Game counts.** No screen shows a team's full schedule, so the game-count check reads expected values from the e2e store snapshot. It compares them with on-screen records (wins + losses) wherever records are shown. *(My call.)*
- **Failed-login console error.** The failed-login path logs a `console.error` today. It goes on the allowlist, but only inside the bad-credentials test. *(My call.)*
- **No toast UI is mounted today.** `sonner` exists only as a shadcn primitive, with no `<Toaster>` and no error boundary. Item 1's "error toast" check is written against the Toaster's DOM, so it starts working whenever a Toaster is mounted. Until then, uncaught page errors and console errors are the signal.

## Left to the builder

- **Test layout:** an `e2e/` directory at the repo root (kept out of vitest's include), page objects and helpers, and how the 13 items split across spec files and Playwright projects. Use projects to run the viewports in parallel.
- **Locators:** prefer roles and visible text. Add `data-testid` only where needed.
- **Reading game data off the screen.** If something a check needs isn't shown anywhere (a full team schedule, conference records), first look for the UI that shows it. If there is none, expose a read-only snapshot of the Redux store on `window` **only** in an e2e build (a `NEXT_PUBLIC_E2E=1` flag checked at build time, so it is compiled out of production). Assertions about what the user sees must still come from the screen. The snapshot only provides expected values.
- **Time limits per phase:** measure the real durations, then set each limit to about 2-3x that.
- **Speed:** if real-time play makes the job too slow, Playwright's `page.clock` may fast-forward the game's timers. The stall checks still have to fail on a real stall: an action that never fires must still time out.
- **Fake Supabase URL** and how auth sessions are faked (supabase-js stores the session in cookies/localStorage via `@supabase/ssr`). Seeding a session vs. answering the `/auth/v1/token` call is the builder's choice; the login-dialog test must go through the real form.
- **The project rule file** `.claude/rules/e2e.md` (path-scoped to `e2e/**`, `playwright.config.ts`), plus a row in `CLAUDE.md`'s rule index, the commands in `CLAUDE.md`, and the step 7 status in `docs/DIAGNOSIS.md`.
