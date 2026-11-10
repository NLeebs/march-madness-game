# Stats jobs in Postgres (roadmap step 5b) - design

Date: 2026-11-09. Fixes `docs/DIAGNOSIS.md` finding 23.

## Intent

The app is a free hobby project and **must stay on the Supabase free plan** - that is a standing goal for the whole app, not just this step. Today six public Edge Functions (`supabase/functions/*`, all `verify_jwt: false`) recompute the stats tables on pg_cron schedules. Anyone who finds a URL can call them in a loop, and every call reads every bracket, pick and game and rewrites the stats tables. The owner's main worry is the bill / free-plan quota, not the data. Separately, the jobs are expensive even with no outside callers: `calculate_bracket_stats` and `calculate_user_total_stats` run every 30 minutes and make two round trips per bracket, for every bracket ever saved, then upsert row by row. That grows with every bracket played and will eventually hit the Edge Function time limit or become the main DB load.

**Decision (owner):** move all six jobs into Postgres functions that pg_cron calls directly, then delete the public Edge Functions so nothing is left to call from outside. Where the code is cheapest and safest is the criterion; the owner is not attached to TypeScript.

**Decision (owner):** fix bugs during the rewrite rather than reproduce today's numbers. Every behavior change is listed below so the owner can veto it.

**Decision (owner):** stats lagging up to ~30 minutes behind a saved bracket is fine. Any cost saving that keeps lag at about that level is worth taking.

## Goals

- No publicly callable endpoint can trigger stats recomputation or year creation.
- The six jobs run as set-based SQL inside the database: a few statements per job, no per-bracket round trips, no per-row upserts.
- The stats tables keep their current names, columns and unique keys, so the dashboard RPCs, repositories and the website need no change.
- The new functions are covered by pgTAP tests in `supabase/tests/database/` that run in CI ("Database tests").
- Every change to production is reversible with a small migration, and the old Edge Functions stay deployed until the owner approves deleting them.

## Non-goals

- No change to stats table schemas, dashboard RPCs or app code (step 4 handles generated types).
- No server-side bracket scoring (step 9). `user_brackets.score` is still read as-is.
- No event-driven / real-time stats (no triggers on bracket insert).
- No change to the anonymous-bracket rule: brackets without `user_id` are excluded from per-user stats, as today. (Global stats include them, as today - see below.)

## Anti-goals

- Anything that needs a paid Supabase feature or adds per-call cost (more Edge Function invocations, external schedulers, paid add-ons).
- New functions callable through the Data API (PostgREST) by `anon` or `authenticated`. Postgres grants `EXECUTE` on new functions to `PUBLIC` by default; that must be revoked.
- Changing hosted state outside a reviewed migration, or without the owner's explicit OK.

## Constraints

- Migrations auto-apply to production on merge to `main` (`.github/workflows/deploy-migrations.yml`). Merging is the hosted write; the owner approves the merge. Each migration must work with the currently deployed app code.
- The baseline schema migration must stay an exact mirror of the hosted dump; changes go in new migrations.
- Deleting hosted Edge Functions is a separate manual step (`npx supabase functions delete <name> --project-ref mowmxsorkncjycsomqpn`) that needs the owner's explicit OK at the time.
- pg_cron and pg_net are already enabled (baseline migration lines 16, 23), locally and hosted. pg_cron jobs run as the `postgres` role.
- Follow TDD as in step 5: write the failing pgTAP test first, then the migration. Run the whole DB suite (files depend on `00_helpers.test.sql`).

## Design

### Where the functions live

A new schema, `stats` (name is the builder's call), that is **not** in the Data API's exposed schemas. Functions in it are owned by `postgres`; `EXECUTE` is revoked from `PUBLIC`, `anon`, `authenticated` (and `service_role` - nothing in the app calls them). `SECURITY INVOKER` is enough, since pg_cron runs them as `postgres`. If a function must live in `public` for any reason, the same revokes apply and a pgTAP test proves `anon`/`authenticated` can't execute it.

One function per job, each one transaction:

| Old Edge Function | New function | Schedule (unchanged) | Writes |
|---|---|---|---|
| `calculate_bracket_stats` | `stats.refresh_user_bracket_stats()` | `*/30 * * * *` | `user_bracket_stats` |
| `calculate_user_total_stats` | `stats.refresh_user_total_stats()` | `*/30 * * * *` | `user_total_stats` |
| `calculate_global_team_stats` | `stats.refresh_global_team_stats()` | `0 */12 * * *` | `global_team_stats` |
| `calculate_global_conference_stats` | `stats.refresh_global_conference_stats()` | `0 0 * * *` | `global_conference_stats` |
| `calculate_seed_matchup_stats` | `stats.refresh_seed_matchup_stats()` | `0 0 * * *` | `seed_matchup_stats` |
| `inset-new-year` | `stats.add_current_year()` | `0 6 1 1 *` | `years`, `tournament_scoring_rules` |

*(Code review update, 2026-11-10: the two 30-minute jobs became one cron job, `Calculate User Stats` -> `stats.refresh_user_stats()`. It computes the fingerprint once and runs both refreshes. Upserts skip unchanged rows with an `IS DISTINCT FROM` guard rather than always rewriting them.)*

Each refresh is `INSERT ... SELECT ... ON CONFLICT (<existing unique key>) DO UPDATE`, setting `updated_at = now()`, followed by deleting stats rows whose source no longer exists (e.g. a `user_bracket_stats` row whose bracket was deleted). Unique keys used: `user_bracket_stats(bracket_id)`, `user_total_stats(user_id, year_id)`, `global_team_stats(year_id, team_id)`, `global_conference_stats(year_id, conference_id)`, `seed_matchup_stats(year_id, round_id, higher_seed, lower_seed)`.

`add_current_year()` inserts the current UTC year into `years` and a `tournament_scoring_rules` row for it, both `ON CONFLICT DO NOTHING`, with the description and version text copied verbatim from `supabase/functions/inset-new-year/description.ts` (version `1.0.0`).

### Skip when nothing changed (cost saving)

The two 30-minute jobs exit early when no `user_brackets` or `tournament_games` row was created since that job's last successful run. A small table (`stats.refresh_log(job text primary key, last_run_at timestamptz)`, not exposed) records the last run. The daily / 12-hourly jobs may use the same check (builder's call).

The check also compares the `user_brackets` row count with the count at the last run, so a deleted bracket triggers a refresh too. `user_bracket_stats` rows already go via `ON DELETE CASCADE`, but `user_total_stats` would otherwise wait for the next new bracket. *(Builder's call, from the review.)*

Known gap, accepted: a pick **edited** after its bracket was saved (possible only by calling the API directly, finding 26) won't be reflected until the next new bracket or game triggers a run. The app never edits picks.

*(Code review update, 2026-11-10: as built, the check is `stats.inputs_fingerprint()`, compared with the value stored in `stats.refresh_log` by each job. Each part is a count plus a sum of hashes of `(id, xmin, ctid)` over non-anonymous brackets, their picks and those picks' games, and `teams`. That closes the edited-pick gap above, plus deletes combined with backdated inserts and conference changes. Anonymous saves no longer trigger a refresh. Remaining cost follow-ups are DIAGNOSIS findings 27-30.)*

### Cron jobs

*(Code review update: the two per-user jobs were then merged into `Calculate User Stats`; see `supabase/cron/jobs.md`.)* A migration re-points each existing pg_cron job, by its existing name, to `select stats.<fn>();`, using `cron.schedule(job_name, schedule, command)`, which updates a job with the same name. The names are the headings in `supabase/cron/jobs.md` (e.g. `Calculate User Bracket Stats`). Schedules are unchanged. The jobs no longer use pg_net. `supabase/cron/jobs.md` is updated to match and notes that the jobs are now managed by migration.

Before merging, confirm read-only (Supabase MCP) that the hosted `cron.job` rows belong to `username = 'postgres'`. `cron.schedule` only replaces a same-named job owned by the same user; otherwise it adds a second job and both run. If they belong to another user, the migration unschedules by `jobid` first.

Rollback is one migration that reschedules each job with its old `net.http_post(...)` command from `jobs.md`, as long as the Edge Functions haven't been deleted yet.

### Rollout (each hosted step needs the owner's OK)

1. **PR A (this step):** schema, functions, refresh log, revokes, tests, cron re-point, docs. Merging it applies it to production. After deploy, verify read-only: `cron.job` shows the new commands, `cron.job_run_details` shows successful runs, and stats `updated_at` advances.
2. **Soak:** leave the old Edge Functions deployed but unused for a short period (suggest about a week, until the next run of each daily job has succeeded and the owner has looked at the dashboard).
3. **Delete:** with the owner's OK, delete the six hosted Edge Functions, then remove `supabase/functions/` from the repo in a follow-up PR. Finding 23 closes once the functions are deleted. The stack-trace leak goes away with them.

## Behavior changes (bug fixes) - owner may veto any

Shared rule: a pick or game only counts towards "correct" / win / loss / upset stats once its game has a `winning_team_id`. Play-in games (`is_play_in = true`) never count as first-round games or upsets.

**`user_bracket_stats`**
1. First-round "upset picked" now requires the picked seed to be the *higher number* in a game with unequal seeds. Today, in a game with equal seeds, picking either team counts as an upset.
2. `champion_picked_team_id` / `champion_correct` are set only from the finals game. That is today's intent; it no longer depends on loop order.

**`user_total_stats`**
3. Picks on games with no result no longer count towards `total_picks` / percentages. Today they count, and a null pick on an unplayed game counts as "correct".
4. `last_three_average_score` / `last_ten_average_score` use the user's most recent brackets that year, ordered by `user_brackets.created_at` (newest first). Today brackets are read in no order, so "last three" is arbitrary, and "last ten" is never computed (always 0) because of an `else if` bug.
5. Thresholds: `average_score` and `last_three_average_score` are set when the user has ≥5 brackets that year (**kept on purpose** - it stops one lucky bracket topping the average ranking). `last_ten_average_score` is set when the user has ≥10. Below the threshold the value is 0, as today (`average_score` is NOT NULL).
6. `average_score_rank` is NULL for users below the 5-bracket threshold. Today they are ranked with an average of 0 and crowd the bottom of the ranking. (The column is already nullable. The app's zod schema types it non-null, but it is only used as a TS type, and no UI reads the rank columns. Checked in review.)
7. Ranks are competition ranks within a year (ties share a rank, the next rank skips) - same as today, now via `rank()`.
8. Ties for `top_picked_champion_id` / `top_picked_conference_id` are broken by the most recent pick (`user_picks.created_at`, then `user_brackets.created_at`), then by id. Today it depends on read order. The `total_top_picked_*` counts are unchanged.
9. Averages round to the nearest integer, and percentages to one decimal, as today. Postgres rounds halves away from zero; JS `Math.round` rounds them up. The difference is negligible because scores are positive.

**`global_team_stats` / `global_conference_stats` / `seed_matchup_stats`**
10. Games with no winner (only possible for rows the app didn't write - every app-saved game has a winner) no longer count as a loss for the favored team / a win for the underdog (today's `else` branch in the conference job).
11a. **Play-in appearances (owner decision):** each team counts at most one `tournament_appearance` per simulated tournament. Today play-in games are saved as round 1 games (`is_play_in = true`), and every round 1 game adds an appearance for both teams, so play-in winners get 2. New rule: appearances = non-play-in round 1 games played + play-in games lost. A play-in loser still made the field (1), and a play-in winner is no longer double-counted (1). Play-in results still count towards conference wins/losses (they're real games). Per the shared rule they don't count as upsets or points scored. Points scored already skipped play-ins.
11. Teams with no stats activity still get a row with zeros, as today.
12. Global stats still include anonymous brackets' games and picks, as today. They are aggregate, so that's intended.

**Kept as-is (flagging, not changing):** each bracket has its own simulated `tournament_games`, so "global" stats aggregate across all simulations. `tournament_round_scoring` is per round, not per rules version, so team points use the current per-round score for every year. The seed-matchup job records equal-seed games (e.g. 1 v 1 in the Final Four) with the favored team as "higher seed".

## Tests (pgTAP, `supabase/tests/database/12_*` onward)

Write each test before the migration it covers, and watch it fail first. Build fixtures with the `00_helpers` style: a year, rounds, scoring, two users, 5-11 brackets with known `created_at` and scores, games with and without winners, a play-in, an equal-seed game.

- Each refresh function produces the exact expected rows for the fixture, including every behavior change 1-10.
- Running a refresh twice is idempotent. Deleting a bracket removes its stats row on the next run.
- The skip check: a second run with no new brackets/games doesn't touch `updated_at`, and inserting a bracket makes the next run refresh.
- `add_current_year()` creates the year + rules once, and a second call is a no-op.
- `anon` and `authenticated` cannot execute any `stats.*` function, and `stats` is not reachable via the Data API (no usage grant).
- `cron.job` contains the six jobs by name with the new commands and unchanged schedules, and none uses `net.http_post`.

## Left to the builder

- Exact schema/function names, SQL structure (CTEs vs temp tables), and whether to share helper SQL between jobs.
- Whether the daily jobs also use the skip check.
- Migration split (one vs several files), as long as each one is safe to auto-apply with the current app.
- Rollback migration: write and test it (apply, check the cron commands) but don't merge it unless needed. Keep it in the plan as a ready file.

## Docs to update in the same PR

`docs/DIAGNOSIS.md`: finding 23 status, roadmap 5b row. `supabase/cron/jobs.md`: new commands, now managed by migration. `CLAUDE.md`: stats jobs now live in the `stats` schema, and Edge Functions are retired (or pending deletion).
