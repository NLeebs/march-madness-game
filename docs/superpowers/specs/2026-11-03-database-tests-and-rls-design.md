# Database tests, RLS hardening and automatic migration deploys - design

Roadmap step 5 in `docs/DIAGNOSIS.md` (findings 21 and 22). Agreed 2026-11-03.

## Why

The hosted Supabase database has no tests, and the baseline schema dump
(`supabase/migrations/20261103195820_remote_schema.sql`) showed RLS policies that let any
signed-in user write data they shouldn't, using only the public anon key and their JWT against
PostgREST. The owner wants robust policies and robust tests around the database, so that current
behavior is locked in, security holes are closed and proven closed, and future migrations ship
safely and automatically.

## Goals

1. **pgTAP test suite** (`supabase test db`) running against a local Supabase database, covering:
   - every table's RLS policies, both allowed and denied cases, for `anon`, `authenticated` (own
     rows vs. someone else's rows) - including policies that are already correct, so they can't
     silently loosen later;
   - the dashboard RPC functions (a basic check each - see below).
2. **Fix the RLS holes, test-first**: for each hole, a pgTAP test that fails against the baseline
   schema, then a new migration that makes it pass.
3. **CI**: a new database-test job on every PR and on `main`.
4. **Automatic deploys**: merging to `main` applies new migrations to the hosted project.
5. **Capture what's still only in hosted**: the 6 Edge Functions and the 6 `pg_cron` job
   definitions go into the repo (read-only download), so they're under version control.

## Non-goals

- Changing how the app accesses data. Server code keeps using the service-role client (which
  bypasses RLS). Moving user data onto the cookie-scoped client is roadmap step 13.
- Server-side score computation and atomic bracket persistence (step 9). This step only blocks
  direct score writes through the public API.
- Generated TypeScript DB types (step 4).
- Changing any dashboard function's logic. Tests describe current behavior; if a test reveals a
  bug, record it in `docs/DIAGNOSIS.md` and stop to ask - don't fix it in this step. Known case,
  owner agreed to log not fix: `get_top_picked_conferences_by_year` filters
  `is_power_conference = false`, but the dashboard labels it "Top Picked Conference" and its
  siblings don't filter - test it as-is.
- Testing or changing the Edge Functions' aggregation logic, or locking down who can invoke them
  (all 6 have `verify_jwt: false`). That's a new roadmap step after this one. This step only
  downloads their source.
- Changing or deploying cron jobs or Edge Functions. The deploy workflow only pushes migrations.

## Anti-goals (failure even if everything is green)

- **Breaking sign-up or the username check.** Two browser flows use the public anon client
  directly and therefore depend on RLS:
  - `src/hooks/useFieldAvailability.ts` - selects `profiles.username` (works for `anon`);
  - `src/hooks/useSignUp.ts` - signed-in new user inserts their own `profiles` row.
  Both must have tests that pass before and after the fix migration.
  Verified read-only against hosted (2026-11-03): no triggers on `auth.users`, 6 users / 6
  profiles, all confirmed at sign-up time - so email confirmation is effectively off in
  production (local `config.toml` matches: `enable_confirmations = false`), `signUp` returns a
  session, and the browser profile insert runs as `authenticated` under
  `profiles_insert_authenticated`. That is the flow to guard.
- **Breaking any server path.** Everything else in the app goes through service-role; the fix
  migration must not revoke anything from `service_role`.
- **Editing the baseline migration.** It stays an exact mirror of production; all changes go in
  new migrations.
- **Writing to the hosted database outside the agreed one-time setup and the deploy workflow.**
  Read-only inspection through the read-only Supabase MCP server is fine (Claude's call).

## The security fixes (one new migration, or a few small ones - builder's call)

| # | Problem today | Required end state |
|---|---|---|
| a | `user_picks_insert_authenticated` is `WITH CHECK (true)` - insert picks into anyone's bracket | `authenticated` may insert a pick only when `bracket_id` belongs to a bracket with `user_id = auth.uid()`, **and** the pick's `game_id` is a `tournament_games` row in the same `year_id` as that bracket |
| b | `tournament_games_insert_authenticated` is `WITH CHECK (true)` - anyone signed in can insert game results | No insert/update/delete on `tournament_games` for `anon` or `authenticated` (drop the policy and revoke the privileges). Only `service_role` writes. |
| c | `user_brackets` has `GRANT ALL` to `anon`/`authenticated`, so a client can insert any `score` and later update it | `anon`/`authenticated` cannot set or change `score` (column-level privileges or a trigger - builder's call). Inserting a bracket with the default score must keep working for both roles, as today. |
| d | `user_brackets_update_authenticated`, `user_picks_update_own`, `profiles_update_own` have `WITH CHECK` but no `USING` | Write the test first to establish whether another user's row can actually be targeted. Either way, end state: each has a `USING` clause matching its ownership rule, so a user can only update their own rows. |
| e | `debug_auth_context()` leftover debug RPC, executable by `anon` | Dropped. |

Every other existing policy is believed correct and gets covered by "still allowed / still denied"
tests. Notably: public `SELECT` on reference tables (`years`, `teams`, `conferences`, `rounds`,
`tournament_games`, `tournament_scoring_rules`, `seed_matchup_stats`, `profiles`);
authenticated-only `SELECT` on the stats tables; `tournament_round_scoring` readable only by
`authenticated` users with `user_role` claim `admin`/`scorer`/`organizer`; `no_direct_inserts`
on `seed_matchup_stats` and `tournament_scoring_rules`; anon bracket insert requires
`user_id IS NULL AND anon_user_id IS NOT NULL`; delete policies scoped to own rows.

If writing a "correct" test reveals another hole, add a failing test plus a fix in this step and
note it in `DIAGNOSIS.md`.

## Dashboard RPC tests

The real stats math lives in 6 Edge Functions (`calculate_global_team_stats`,
`calculate_global_conference_stats`, `calculate_seed_matchup_stats`, `calculate_bracket_stats`,
`calculate_user_total_stats`, `inset-new-year`) run by `pg_cron`, which write precomputed rows
into `global_team_stats`, `global_conference_stats`, `seed_matchup_stats`, `user_bracket_stats`,
`user_total_stats`. The 17 read RPCs only filter, join, order and `limit`. So fixtures here are
**stats rows**, not games and picks, and every RPC gets a **basic check** (owner agreed;
thorough aggregation testing moves to the Edge Functions step):

- returns only rows for `p_year_id` (fixture includes another year's rows that must be excluded);
- ordered by its metric descending, cut off at its `limit` (5, or 8 for the seed-matchup one);
- joins return the right team/conference name and logo;
- where present: the round filter (`get_seed_matchup_upset_percentages_by_year_and_round`), the
  `is_power_conference = false` filter (the non-power functions and, as-is,
  `get_top_picked_conferences_by_year`);
- `get_top_picked_teams_for_user_and_year` is the one function that reads raw picks: check it
  counts only that user's picks in that year.

All RPCs are `SECURITY INVOKER` and the app calls them with service-role, so tests call them as
a role that bypasses RLS. Expected values are worked out by hand from the fixture, never copied
from running the function.

## Capturing Edge Functions and cron jobs

- Download all 6 Edge Functions into `supabase/functions/<slug>/` with the CLI
  (`supabase functions download`) - read-only.
- Record the 6 `pg_cron` jobs (name, schedule, command) in the repo, e.g. as a SQL file or doc
  under `supabase/`. **The job commands call `net.http_post` with headers that may contain a
  key or bearer token - redact any secret before committing** and note where the real value
  lives. Format is the builder's call; it is documentation, not a migration (the deploy
  workflow must not apply it).
- Add to `docs/DIAGNOSIS.md`: a new roadmap step "Edge Function tests + invocation lockdown"
  after step 5, a finding for `verify_jwt: false` on all 6 functions, and the
  `get_top_picked_conferences_by_year` filter as a suspected bug.

## CI

- New job in `.github/workflows/ci.yml` (parallel to the existing `check` job), runs on every PR
  and on push to `main` - **not** path-filtered, so it can be a required status check without
  leaving PRs stuck. Cost accepted: ~1-3 min of Docker startup; Actions minutes are free (public repo).
- Starts only what the tests need (`supabase db start`, not the full stack, if sufficient), then
  `supabase test db`.
- On PRs that change `supabase/migrations/`, also print what would be applied to production
  (`supabase db push --dry-run` against the hosted project, which needs the deploy secrets).
  It must not apply anything.

## Automatic deploys

- New workflow: on push to `main` **only when `supabase/migrations/**` changed**, run
  `supabase db push` against project `mowmxsorkncjycsomqpn`, non-interactively (CLI v3 requires
  `--yes` or `SUPABASE_YES` for hosted changes).
- Goes straight to production, no approval gate - owner's decision. A brief mismatch while
  Vercel deploys the app is acceptable (personal game, few users).
- Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` as GitHub Actions secrets.
- Add to `CLAUDE.md`: migrations must be compatible with the currently deployed app code; the
  deploy workflow applies them on merge.

## One-time setup (each needs the owner's explicit OK at the time)

1. `supabase migration repair --status applied 20261103195820` against hosted, so `db push`
   doesn't try to re-run the baseline. This writes to hosted - confirm first.
2. Owner adds the two GitHub secrets themselves (Claude never sees the values).
3. Branch protection on `main`: both CI jobs required to pass before merge.

Order matters: repair (1) and secrets (2) must be in place before the first merge that touches
`supabase/migrations/`, which is this step's own PR.

## Process

TDD per `CLAUDE.md`: failing pgTAP test -> watch it fail for the right reason -> fix migration ->
green. Characterization tests for correct policies and RPCs should pass on the baseline from the
start (they describe current behavior). Spec and plan committed under `docs/superpowers/`.

## Left to the builder

- Test file layout under `supabase/tests/`, naming, and whether to use a helper library (e.g.
  Basejump `supabase_test_helpers`) or hand-written helpers for creating auth users and switching
  roles/JWT claims.
- Fixture strategy (shared `supabase/seed.sql` vs. per-test fixtures inside `BEGIN ... ROLLBACK`).
- Column privileges vs. trigger for fix (c); how many fix migrations.
- Exact CI job wiring (Supabase CLI setup action vs. `npx supabase`).
