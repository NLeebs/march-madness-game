# Application Diagnosis - November 2026

A first-pass health check of the March Madness game, written while setting up Claude Code on the repo. Goal: harden logic and structure **without changing how the game plays**.

## Baseline (measured 2026-11-03)

| Check | Result |
|---|---|
| `npx vitest run` | 54 files, **417 tests, all passing** (~25s) |
| `npm run lint` | Clean |
| `npx tsc --noEmit` (current `strict: false`) | Clean (2 CSS-module errors only because `next-env.d.ts` is gitignored and not yet generated) |
| `npx tsc --noEmit --strict` | **296 errors** - the type-safety backlog |
| CI | None (no `.github/workflows`). Vercel deploys `main` with no gate. |
| E2E tests | None |
| DB schema / migrations in repo | None. 10 tables and ~10 RPC functions exist only in hosted Supabase. |

## What's working well

- **Clear server layering.** `app/api` -> `application/useCases` -> `infrastructure/db` -> `models` is consistent across ~20 endpoints. Each use case is tiny and single-purpose, which makes them trivially testable.
- **Strong API test coverage pattern.** Every endpoint has a unit test (use case, repository mocked) and an integration test (route handler, use case mocked), built on reusable `tests/factories/`.
- **Thoughtful error model.** `AppError` hierarchy + `handleApiError` gives consistent JSON error responses.
- **Security consciousness.** `authorizeUserAccess` on user-scoped routes, zod validation, origin checks and a honeypot/time-based spam protection on forms.
- **TanStack Query** for server state, Redux for game state - a sensible split.

## Findings

Severity: **High** = correctness/security risk, **Med** = maintainability or reliability risk, **Low** = polish.

### Security & data integrity

1. **High - Bracket score is trusted from the client.** `POST /api/bracket/simulation` accepts `tournamentState.playerScore` and writes it to `user_brackets.score`. Anyone can POST an arbitrary score, polluting leaderboards/stats. Picks and game results are also `z.any()`. *Fix:* validate structure fully with zod and recompute the score server-side from picks + results + `tournament_scoring_rules`.
2. **High - Every repository uses the service-role key**, so Row Level Security never applies to reads or writes. Authorization rests entirely on hand-written checks in routes. One forgotten `authorizeUserAccess` = data leak. *Fix:* use the cookie-scoped `supabaseServer` client for user-owned data and reserve service-role for genuinely privileged writes (anon brackets, aggregates). Then add RLS tests.
3. **Med - Bracket persistence isn't atomic.** `persistBracket` inserts the bracket, then `persistTournament` fires one insert per game and one per pick, all in parallel (`Promise.all`). Any failure leaves a partial bracket. *Fix:* move into one Postgres function (`persist_bracket(jsonb)`) called via `rpc` - one transaction, one round trip.
4. **Med - Rate limiter is in-memory.** `rateLimit()` uses a module-level `Map`; on Vercel serverless each instance has its own map, so the limit barely applies. *Fix:* Upstash/Vercel KV, or a Postgres-backed counter.
5. **Low - Inconsistent auth check in `TournamentRepository.persistTournament`** - fetches the user but never compares the id (the earlier `persistBracket` does).

### Game logic

6. **Med - Scoring rules are hard-coded in two places.** `tournamentSlice.comparePicksAndGames` hard-codes 10/20/40/80/160/320 while the DB has `tournament_scoring_rules` per year. They can silently diverge. *Fix:* one pure `scoreBracket(picks, results, rules)` function used by both client and server.
7. **Med - Reducers contain business logic and stringly-typed indexing.** `setTournamentGameResults`, `setTournamentSeeds`, `comparePicksAndGames` use `state[nextRoundKey][nextRegion]` with keys computed in `if` ladders; untyped `action`s. *Fix:* extract round/region maps (`ROUND_CONFIG`) and pure functions in `src/functions/tournament/`, keep reducers as thin assignments, type every `PayloadAction`.
8. **Med - `playGame.ts` (412 lines) is untestable as written.** Calls `Math.random()` directly and mirrors every block for favored/underdog. *Fix:* inject an `rng: () => number` (default `Math.random`) so tests can seed it; collapse the duplicated favored/underdog code into `simulatePossession(offense, defense, rng)`. Behavior stays identical.
9. **Med - No tests on the core game.** Coverage is strong on the API but near zero on `playGame`, seeding, `tournamentSlice`, `tournamentPlayersPicksSlice` - the parts most likely to break during refactoring. These need characterization tests *before* any refactor.
10. **Low - `appStateSlice` is a bag of 17 booleans** representing what is really a single phase plus a current round. Invalid combinations are representable. Long-term: `phase: "start" | "regularSeason" | ...` + `currentRound`.

### React components

11. **Med - Heavy components mix layout math with rendering.**
    - `Tournament.tsx` (547 lines): a 40-line `if/else` ladder computing UI positions, then six near-identical `motion.div` column blocks. -> pure `getRoundLayout(selectedRound, screenWidth)` + a reusable `<BracketColumn round regions layout>`.
    - `RoundSelectButton.tsx` (286), `TournamentRound.tsx` (309), `PlayTournamentGames.tsx` (233) - similar extraction: logic into hooks (`useTournamentRoundPlayback`, `useRoundSelection`), presentational components take props.
    - `TeamBar.tsx` (204) and `TournamentMatchup.tsx` read Redux directly; making them prop-driven makes them reusable in the dashboard and in tests.
12. **Med - Hook boilerplate.** 15+ hooks repeat the same `fetch -> !ok -> throw AppError -> json()` block (`useMadnessPrep` has it six times). -> one `apiGet<T>(path)` helper + `useApiQuery<T>(key, path, enabled)`; responses typed from `models/`.
13. **Low - `screenWidth` is in Redux and drives layout via JS.** Works, but re-renders the bracket on every resize. A `useMediaQuery` hook already exists; Tailwind breakpoints could replace much of it.
14. **Low - `reactStrictMode: false`.** Usually hides effect bugs (e.g. `setRoundOneMatchups` dispatched in an effect). Worth turning on once tests exist.

### Type safety

15. **Med - `strict: false`, 296 strict errors.** The tsconfig path `"*": ["types/*"]` also lets bare imports resolve into `types/`, which is surprising. By folder: `src/` 233, `store/` 53, `application/` 5, `tests/` 3, `infrastructure/` and `utils/` 0. *Plan:* enable `strict` per-folder incrementally (start with `application/`, `infrastructure/`, `utils/`, which are already clean or nearly so), then `src/functions`, then `store`, then components.
16. **Med - DB types are hand-written** (`models/appStatsData/*Supabase.ts`) and can drift from the real schema. *Fix:* `supabase gen types typescript` -> `types/database.ts`, typed `SupabaseClient<Database>`, derive the model types from it.
17. **Low - Zod schemas and TS types are defined separately** for the simulation request. Derive with `z.infer`.

### Tooling & ops

18. **Med - No CI.** Broken builds go straight to production via Vercel.
19. **Low - Dependency drift.** `eslint-config-next@13.4.7` with `next@14`, Redux Toolkit 1.x, legacy `firebase` still bundled. Address after CI exists.
20. **Low - Stale docs.** Root `README.md` is the create-next-app template; `README-API-Error-Handling.md` describes `apiHandler`, which no route uses.

## Roadmap - small steps

Each step is a separate branch + PR, small enough to review in one sitting. Order matters: safety nets first, then refactors.

| # | Step | Why first / notes |
|---|---|---|
| **1** | `CLAUDE.md` + this diagnosis | Done in this PR. |
| **2** | **GitHub Actions CI**: `npm ci`, lint, `tsc --noEmit`, `vitest run` on PRs and `main` | Cheapest, highest-leverage safety net. Commit `next-env.d.ts` or generate it in CI. |
| **3** | **Connect Supabase**: Supabase MCP server for Claude (read-only first) + Supabase CLI; `supabase db pull` the schema into `supabase/migrations/` | Gets schema and RPCs under version control. Prereq for 4, 5, 9. |
| **4** | **Generated DB types** (`supabase gen types`) wired into repositories | Type safety against the real schema. |
| **5** | **Database tests** with pgTAP (`supabase test db`) on a local Supabase (Docker): RLS policies, RPC outputs on seeded fixtures | Tests the logic that currently has zero coverage. Add to CI. |
| **6** | **Characterization tests for the game engine**: seeded-RNG `playGame`, seeding, tournament reducers, scoring | Must exist before refactoring 7-8. |
| **7** | **Playwright**: smoke E2E (start -> regular season -> picks -> tournament -> recap) with persistence mocked via route interception; add to CI | Locks in end-to-end behavior before UI refactors. |
| **8** | **Game-logic extraction**: `ROUND_CONFIG`, pure `scoreBracket`, injectable RNG in `playGame`, typed reducers | Tests from 6 must stay green. |
| **9** | **Server-side score + atomic persistence** (`persist_bracket` RPC, full zod schema) | Fixes findings 1, 3, 6. |
| **10** | **Component decomposition**: `Tournament.tsx` first (`getRoundLayout` + `<BracketColumn>`), then `TournamentRound`, `RoundSelectButton`, `PlayTournamentGames` | Playwright from 7 guards behavior. |
| **11** | **`apiGet` / `useApiQuery`** helper, typed responses | Quick win, mechanical. |
| **12** | **Incremental `strict`** folder by folder | Ongoing; CI keeps the ratchet. |
| **13** | **RLS-first data access** (cookie client for user data) | After DB tests exist to prove policies. |
| Later | Real rate limiting, `appState` as a phase enum, StrictMode on, dep upgrades, README refresh | |
