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
| DB schema / migrations in repo | None at time of diagnosis. **Update:** baseline schema dumped to `supabase/migrations/20261103195820_remote_schema.sql` (15 tables, 20 functions, 29 RLS policies). |

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

#### Added after the schema dump (step 3)

21. **High - Two RLS insert policies are open to any logged-in user** (found in the baseline schema dump; live in production). The app doesn't hit them today (it writes with service-role), but any signed-in user can call PostgREST directly with the public anon key + their JWT:
    - `user_picks_insert_authenticated` - `WITH CHECK (true)`: insert picks into *anyone's* bracket. The matching update/delete policies are already scoped to own brackets. *Fix:* `WITH CHECK` that the bracket belongs to `auth.uid()` **and** `game_id` is a `tournament_games` row in the same `year_id` as that bracket. **Fixed in step 5 (migration `20261109142854_restrict_user_picks_insert.sql`).**
    - `tournament_games_insert_authenticated` - `WITH CHECK (true)`: insert fake game results that feed dashboard stats. *Fix:* drop the policy (service-role only) and revoke insert from `anon`/`authenticated`. **Fixed in step 5 (migration `20261109142315_lock_tournament_games_writes.sql`; insert/update/delete/truncate revoked).**
    - `user_brackets` has `GRANT ALL` to `authenticated` (and an insert policy for `anon`), so a user can insert a bracket with any `score` and later `UPDATE` their own bracket's score. This is finding 1 at the database layer. *Fix:* revoke direct insert/update of score columns from `anon`/`authenticated` (or a trigger that rejects score changes unless service-role); step 9 then computes the score server-side. **Fixed in step 5 (migration `20261109143058_protect_user_brackets_score.sql`; column-level grants, `score` excluded).**
    - **To verify in tests:** `user_brackets_update_authenticated`, `user_picks_update_own` and `profiles_update_own` have `WITH CHECK` but no `USING`. If that leaves the target-row filter open, a user could re-own someone else's row (e.g. set `user_id` to themselves). Write a pgTAP test for it; *fix:* add `USING` matching the `WITH CHECK` on each.
    - **Result (step 5, fix d):** confirmed the three update policies had no `USING`, so own-row updates by clients matched no rows in production (no cross-user hole). Adding `USING` enables own-row updates (migration `20261109143330_add_using_to_update_policies.sql`). Enabling updates reopened the cross-year hole, so the update `WITH CHECK`s and the `user_brackets` column grant were then tightened so updates can't move picks or brackets across years: picks must stay in an own bracket with a same-year game, `year_id`/`anon_user_id` are no longer updatable by clients, and scoring rules must match the bracket's year (migration `20261109145257_tighten_update_checks.sql`).
22. **Low - Schema housekeeping.** `debug_auth_context()` is a leftover debug RPC granted to `anon` (harmless - returns only the caller's own claims - but should be dropped). **Fixed in step 5 (migration `20261109143536_drop_debug_auth_context.sql`).** The baseline migration is not recorded in the hosted project's migration history; **Repaired 2026-11-09** (baseline marked applied on hosted).

#### Added during step 5

23. **Med - All 6 Edge Functions have `verify_jwt: false`**, so anyone who knows the URL can trigger stats recomputation (cost and load), and `calculate_bracket_stats` returned `err.message` and `err.stack` to unauthenticated callers. **In progress (step 5b):** the stats work moved to `stats.*` SQL functions in a private schema, the cron jobs (migration `20261109211628_schedule_stats_jobs_in_sql.sql`) no longer call the Edge Functions, and the Edge Functions in `supabase/functions/` are pending deletion after a soak period. Rollback file: `supabase/rollback/restore_edge_function_cron.sql`.
24. **Low (suspected bug) - `get_top_picked_conferences_by_year` filters `is_power_conference = false`**, but the dashboard labels it "Top Picked Conference" and its sibling RPCs don't filter. Confirm intent; either rename the label or drop the filter.
25. **Low - Bracket insert policies don't check that `tournament_scoring_rules_id` belongs to the bracket's `year_id`** (the update policy does since step 5). A client inserting directly can create a bracket with another year's rules. Low impact: score isn't client-writable and the app inserts via service-role. *Fix:* add the same rules-year check to `user_brackets_insert_anon` / `user_brackets_insert_authenticated` WITH CHECK.
26. **Low - Picks aren't checked for timing or validity.** A signed-in user can still insert or update their own picks after the game has a result, and `user_picks.picked_team_id` isn't required to be one of that game's two teams. This was already possible before step 5, and step 5 narrowed it (picks must be in an own bracket with a same-year game). It only affects the user's own bracket and stats. *Fix (step 9):* once the server computes the score, reject pick writes for games that already have a winner, and require `picked_team_id` to be one of the game's two teams (in the policy `WITH CHECK` or the `persist_bracket` RPC).

#### Added in the PR #12 code review (step 5b, 2026-11-10)

Fixed in PR #12 before merge, each with a failing pgTAP test first:
- Refreshes no longer rewrite unchanged stats rows. Every `ON CONFLICT DO UPDATE` has an `IS DISTINCT FROM` guard; the tests check that `ctid` does not change on a rerun.
- The skip-check fingerprint (`stats.inputs_fingerprint`) leaves out anonymous brackets and their picks and games, so logged-out saves no longer force a full per-user rebuild. It also catches deletes combined with backdated inserts, score updates, edited picks and team conference changes: each part is a count plus a sum of hashes of `(id, xmin, ctid)` instead of count plus `max(created_at)`.
- `refresh_user_bracket_stats` drops anonymous brackets in its first join instead of at the end.
- The two 30-minute jobs are now one, `Calculate User Stats` -> `stats.refresh_user_stats()`. It computes the fingerprint once and runs the two refreshes one after the other.
- Upset-pick logic lives in one inlinable function, `stats.is_first_round_upset_pick`.
- Removed a no-op `alter default privileges ... revoke` (it can't remove PUBLIC's global EXECUTE default). Every `stats.*` function needs its own REVOKE; `19_stats_cron_and_privileges.test.sql` fails if one is missing.
- DB tests no longer assume an empty database: they compare fingerprints before and after, and count only fixture rows.

Still open:

27. **Med (cost) - Per-user refreshes still rebuild every bracket ever saved.** When the fingerprint changes, `refresh_user_bracket_stats` and `refresh_user_total_stats` recompute from every non-anonymous pick (picks joined to games joined to rounds). Writes are now only for changed rows, but the reads grow with all history, not with new brackets. That is the scaling problem the old Edge Function had, moved into SQL. A bracket's stats can't change once its picks and games are saved, so an incremental refresh would be much cheaper. It is not safe yet because persistence isn't atomic (finding 3): the bracket row is inserted first and its picks arrive in separate requests, so "brackets newer than the last run" or "brackets with no stats row" can catch a bracket half-saved and never revisit it. *Fix:* after step 9 (atomic `persist_bracket` RPC), compute stats only for brackets with no stats row or saved since the last run, plus the delete sweep. `user_total_stats` can then recompute only the `(user_id, year_id)` pairs those brackets touch. Ranks are per year, though, so ranks still need a cheap pass over the whole year.
28. **Low (cost) - The fingerprint itself is a full read.** `stats.inputs_fingerprint()` scans `user_brackets`, the join of `user_picks` with `user_brackets` and `tournament_games`, and `teams` every 30 minutes, even when nothing changed. That is cheaper than a rebuild but still grows with history. *Fix (with 27):* bump a change counter from the write path, either in `persist_bracket` (step 9) or with statement-level triggers on the input tables, and compare that counter instead of scanning.
29. **Low (cost) - The global jobs have no skip check.** `refresh_global_team_stats` (every 12 hours), `refresh_global_conference_stats` and `refresh_seed_matchup_stats` (daily) always re-read all games and picks, including anonymous ones. Since the review fix they only write changed rows. *Fix:* give them their own fingerprint over all brackets, picks and games (anonymous included), plus `teams` and `tournament_round_scoring`. Do this together with 28 so they don't add more full scans.
30. **Low - The `rounds` table isn't part of the fingerprint.** It is static reference data. If a round is ever renamed, run `delete from stats.refresh_log;` so the next cron run rebuilds everything.

#### Added in the PR #13 code review (step 4, 2026-11-10)

Fixed in PR #13 before merge:
- `TournamentRepository.getRounds` (and the use case) return `Pick<RoundSupabase, "id" | "round_name">[]` instead of casting the two-column select to the full row.
- The model drift test is also type-checked with `strictNullChecks` (`npm run typecheck:db-types`, `tsconfig.db-types.json`, runs in CI). Under the repo-wide `strict: false`, `T | null` collapses to `T`, so nullability drift went unnoticed. Making one RPC column nullable fails the strict check and passes the default one.
- CI's type-drift step runs after a pgTAP failure only if `supabase db start` succeeded.
- `persistTournament` uses the generated `TablesInsert<"user_picks">` and drops a dead `bracket_id` check.

The review also confirmed findings 3 (non-atomic bracket persistence; the most severe item it found) and 5 (`persistTournament` calls `auth.getUser()` and ignores the result). Both are in step 9. New open items:

31. **Med (cost/reliability) - One HTTP insert per game and per pick.** `persistTournament` sends about 63 `tournament_games` inserts and about 63 `user_picks` inserts per bracket, all at once. That is about 126 PostgREST requests per submit: slower, more likely to hit rate or pool limits (which then leave the partial writes in finding 3), and more of the free-plan request quota. *Fix (step 9):* the `persist_bracket` RPC replaces them with one call. If step 9 slips, a stopgap is two bulk inserts (`insert(games).select("id")`, then one `insert(picks)`).
32. **Low (latency) - Independent queries awaited one after another.** `GetYears` awaits the Supabase and Firebase year lists in sequence. `PersistTournament` does the same with `fetchTeamIdMap` and `fetchRoundIdMap` before the bracket insert. *Fix:* `Promise.all` in both. `PersistTournament`'s part goes with step 9; `GetYears` is a quick win at any time.

### Game logic

6. **Med - Scoring rules are hard-coded in two places.** `tournamentSlice.comparePicksAndGames` hard-codes 10/20/40/80/160/320 while the DB has `tournament_scoring_rules` per year. They can silently diverge. *Fix:* one pure `scoreBracket(picks, results, rules)` function used by both client and server.
7. **Med - Reducers contain business logic and stringly-typed indexing.** `setTournamentGameResults`, `setTournamentSeeds`, `comparePicksAndGames` use `state[nextRoundKey][nextRegion]` with keys computed in `if` ladders; untyped `action`s. *Fix:* extract round/region maps (`ROUND_CONFIG`) and pure functions in `src/functions/tournament/`, keep reducers as thin assignments, type every `PayloadAction`.
8. **Med - `playGame.ts` (412 lines) is untestable as written.** Calls `Math.random()` directly and mirrors every block for favored/underdog. *Fix:* inject an `rng: () => number` (default `Math.random`) so tests can seed it; collapse the duplicated favored/underdog code into `simulatePossession(offense, defense, rng)`. Behavior stays identical. **Partly fixed in step 6:** `playGame(team1, team2, rng = Math.random)` takes a seedable `rng` (same draws in the same order by default), and its behaviour is pinned by invariants, statistical checks and draw-order pins in `tests/game/`. Collapsing the duplication is still step 8.
9. **Med - No tests on the core game.** Coverage is strong on the API but near zero on `playGame`, seeding, `tournamentSlice`, `tournamentPlayersPicksSlice` - the parts most likely to break during refactoring. These need characterization tests *before* any refactor. **Fixed in step 6:** `tests/game/` characterizes the whole loop (schedule, season, `playGame`, Selection Sunday, seeding, bracket advancement, picks and scoring, the tournament driver components, and a seeded full game) on a 360-team fixture. Schedule creation and field selection moved out of components into `createSeasonSchedule` and `selectTournamentField` under that net. See `.claude/rules/game-engine.md`.
10. **Low - `appStateSlice` is a bag of 17 booleans** representing what is really a single phase plus a current round. Invalid combinations are representable. Long-term: `phase: "start" | "regularSeason" | ...` + `currentRound`.

#### Found during step 6 (not fixed; most are pinned as current behaviour in `tests/game`)

33. **Low - `PlayRegularSeasonGames` calls `setSeasonPlayed(true)` inside the per-week loop.** It runs once per week instead of once per season. Harmless today because the effect only plays when `weeksPlayed === 0`, but it reads like a bug.
34. **Low - A one-team conference would crash Selection Sunday.** The champion check compares `sortedWins[0]` with `sortedWins[1]`, which is undefined for a single team. Real data never has one; a guard would make it safe. Not pinned by a test.
35. **Low - An odd total team count leaves a team without a game.** With an odd league, one team sits out each non-conference week, and one leftover sits out each conference week. Real data has an even count today.
36. **Low - `setPick` with an empty `team` but a non-empty `opponent` still clears the opponent from later rounds.** The empty-team guard only skips the write.
37. **Low - Ties are settled by key order.** Equal RPI makes `team1` the favored team (strict `>`), and equal selection scores or wins resolve by the stable sort over `Object.keys(records)` order, including at the at-large cutoff. Deterministic, but arbitrary.
38. **Low - `setTournamentSeeds` is not idempotent.** It pushes onto the region arrays, so dispatching it twice doubles them. `SelectionSunday`'s guard prevents that today. Also, `comparePicksAndGames` scores by walking the next round's matchups, so it must run after the results are recorded (it does). Not pinned by a test.

#### Found in the step 6 code review (deferred to the steps named)

39. **Low - `selectTournamentField` has no guards for malformed input.** Besides finding 34: if a champion has no entry in `records`, `indexOf` returns -1 and `splice(-1, 1)` silently drops the last team from the at-large pool; with fewer non-champions than `NUMBER_OF_AT_LARGE_TEAMS`, `undefined` goes into the field and play-ins. Real data never hits either. *Fix in step 8:* validate inputs and throw, with tests for 34 and 39 together.
40. **Low - The season schedule is dispatched as ~5,400 `addGameToTeamSchedule` actions.** `createSeasonSchedule` already returns the whole schedule; each dispatch notifies subscribers and, in dev, runs RTK's dev checks over the whole state (why tests need `createFastStore`). *Fix in step 8 (typed reducers):* one `setSeasonSchedule(games)` action.
41. **Low - `tests/game/helpers/runGame.ts` `TournamentDrivers` hand-copies `App.tsx`'s mount conditions** for `PlayPlayinGames` and `PlayTournamentGames`. If `App.tsx` changes, the full-run tests keep the old gating. *Fix in step 10:* extract the gating into a small component used by both.
42. **Low - `scheduleConferenceGames` rescans all teams once per conference every conference week** (~170k comparisons per schedule). *Fix in step 8:* group teams by conference once before the week loop; draw order stays identical, so pins hold.

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
16. **Med - DB types are hand-written** (`models/appStatsData/*Supabase.ts`) and can drift from the real schema. *Fix:* `supabase gen types typescript` -> `types/database.ts`, typed `SupabaseClient<Database>`, derive the model types from it. **Fixed in step 4:** `types/database.ts` is generated by `npm run db:types`, all three Supabase clients and the repositories are typed with `Database`, `models/appStatsData` types are aliases of the generated types (existing drift fixed: `user_total_stats` field names, `conferences.is_power_conference`, nullability, `tournament_scoring_rules.version` is text), and CI's `db-tests` job fails when the committed file is stale (`npm run db:types:check`). The model drift test is type-checked with `strictNullChecks` so nullability drift fails CI too (`npm run typecheck:db-types`).
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
| **3** | **Connect Supabase**: Supabase MCP server for Claude (read-only first) + Supabase CLI; schema into `supabase/migrations/` | Done. Used read-only `supabase db dump --remote` rather than `db pull`, which in CLI v3 also writes to the hosted migration-history table. Prereq for 4, 5, 9. |
| **4** | Done. **Generated DB types** (`supabase gen types`) wired into repositories | Type safety against the real schema. CI fails when a migration lands without regenerated types. |
| **5** | Done. **Database tests + RLS policy fixes** with pgTAP (`supabase test db`) on a local Supabase (Docker): RLS policies, RPC outputs on seeded fixtures. Write failing tests for finding 21 first, then a fix migration; also drop `debug_auth_context` and repair migration history (finding 22) | Tests the logic that currently has zero coverage. Add to CI. Applying the fix migration to hosted needs explicit confirmation. Don't let this slip far - finding 21 is live. |
| **5b** | **In progress: replace the 6 stats Edge Functions with `stats.*` SQL functions** (pgTAP-tested) and re-point the cron jobs (finding 23); Edge Functions to be deleted after a soak period | Superseded the original plan (tests plus JWT lockdown). Rollback: `supabase/rollback/restore_edge_function_cron.sql`. Code-review fixes are in the same PR; cost follow-ups are findings 27-30 (27 and 28 belong with step 9). |
| **6** | Done. **Characterization tests for the game engine**: seeded-RNG `playGame`, seeding, tournament reducers, scoring | Also moved schedule creation and field selection out of components. Later refactors may change the order of random draws if the statistical checks still pass (procedure in `.claude/rules/game-engine.md`). Oddities found are findings 33-38; review follow-ups are findings 39-42. |
| **7** | **Playwright**: smoke E2E (start -> regular season -> picks -> tournament -> recap) with persistence mocked via route interception; add to CI | Locks in end-to-end behavior before UI refactors. |
| **8** | **Game-logic extraction**: `ROUND_CONFIG`, pure `scoreBracket`, collapse `playGame`'s duplicated favored/underdog code, typed reducers (injectable RNG in `playGame` was done in step 6). Also findings 34, 39, 40, 42 | Tests from 6 must stay green. |
| **9** | **Server-side score + atomic persistence** (`persist_bracket` RPC, full zod schema) | Fixes findings 1, 3, 6. Also close the pick timing/validity gap (finding 26), remove or fix the unused auth check (finding 5), replace the per-row inserts (finding 31) and run the ID-map lookups in parallel (finding 32). Unblocks incremental stats (findings 27, 28). |
| **10** | **Component decomposition**: `Tournament.tsx` first (`getRoundLayout` + `<BracketColumn>`), then `TournamentRound`, `RoundSelectButton`, `PlayTournamentGames`. Also finding 41 | Playwright from 7 guards behavior. |
| **11** | **`apiGet` / `useApiQuery`** helper, typed responses | Quick win, mechanical. Also parallelize `GetYears` (finding 32). |
| **12** | **Incremental `strict`** folder by folder | Ongoing; CI keeps the ratchet. Generated types already record nullability; turning on `strictNullChecks` will surface the ~40 nullable columns. |
| **13** | **RLS-first data access** (cookie client for user data) | After DB tests exist to prove policies. |
| Later | Real rate limiting, `appState` as a phase enum, StrictMode on, dep upgrades, README refresh | |
