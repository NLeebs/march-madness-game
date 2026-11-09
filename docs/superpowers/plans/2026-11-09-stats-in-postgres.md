# Stats Jobs in Postgres Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the six public stats Edge Functions with set-based SQL functions in a private `stats` schema that pg_cron calls directly, fixing the stats bugs listed in the spec.

**Architecture:** One migration per function (plus a schema/helpers migration and a cron re-point migration), each written after its failing pgTAP test. Each refresh is one `INSERT ... SELECT ... ON CONFLICT DO UPDATE` plus a delete of rows whose source is gone. The two 30-minute jobs skip work when an input fingerprint hasn't changed. Edge Functions stay deployed, unused, until the owner approves deleting them (Release section, not a task).

**Tech Stack:** Postgres 17 (Supabase local, Docker), pgTAP, pg_cron, Supabase CLI v3 via `npx supabase`.

**Spec:** `docs/superpowers/specs/2026-11-09-stats-in-postgres-design.md`. Read it first. Behavior changes are numbered 1-12 (with 11a) there, and the tests below cite those numbers.

## Global Constraints

- Branch `feat/stats-in-postgres` (already exists, spec committed). Commits: conventional prefixes, ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never edit `supabase/migrations/20261103195820_remote_schema.sql` or any already-merged migration. New migrations via `npx supabase migration new <name>`.
- No hosted writes. Read-only Supabase MCP queries are fine. Merging is the hosted write and is the owner's call.
- Every `stats.*` function: `language plpgsql` or `sql`, `security invoker`, `set search_path = ''`, all names schema-qualified (`public.user_brackets`, `stats.refresh_log`).
- `EXECUTE` on every `stats.*` function and `USAGE` on schema `stats` must not be held by `PUBLIC`, `anon`, `authenticated` or `service_role`.
- Round names in `public.rounds.round_name`: `'1'`, `'2'`, `'sweet sixteen'`, `'elite eight'`, `'final four'`, `'finals'`. Play-in games are saved as round `'1'` with `is_play_in = true`. Join rounds by name; there is no unique constraint and the local test DB has no seed rows (tests create them).
- "Resolved" = `tournament_games.winning_team_id is not null`. Correct/incorrect/win/loss/upset/points/percentage stats count resolved games only. Appearance counts (`second_rounds`, `finals`, etc.) and `picks` popularity counts don't require a result.
- "Upset pick" (round 1) = resolved, `round_name = '1'`, `not is_play_in`, `favored_team_seed <> underdog_team_seed`, and `picked_team_seed = greatest(favored_team_seed, underdog_team_seed)`.
- Percentages: `round(100.0 * part / total, 1)`, or `0` when total is 0. Averages: `round(avg(score))` (integer).
- Brackets with `user_id is null` (anonymous) are excluded from `user_bracket_stats` / `user_total_stats` and included in global stats.
- Expected test values are worked out by hand from the fixture (given below), never copied from running the function.
- Run the whole DB suite, not single files: `npx supabase db reset` (local only, applies all migrations) then `npx supabase test db`. Docker must be running.

## Review Focus

1. **Bracket saved, picks saved a moment later** - the app inserts the bracket, then its picks in separate requests. A cron run in between must not leave that bracket stale forever. The fingerprint includes `user_picks` count and max `created_at`. Test in Task 2 (insert a pick after a run -> next run refreshes).
2. **Empty or partial reference data** - no rounds, no scoring rows, or a round with no `tournament_round_scoring` row must not raise. Expected: zero counts, `tournament_points_scored = 0` (not null). Tests in Task 2 (empty DB) and Task 4 (sweet sixteen has no scoring row).
3. **Team with null `conference_id`** - `global_conference_stats.conference_id` is NOT NULL, so such teams must be filtered out rather than fail the insert. Test in Task 5.
4. **Null `picked_team_id`** - counts as a played game but neither correct nor incorrect, and isn't counted towards any conference. Tests in Tasks 2 and 3.
5. **Ranks scoped to a year** - a user's other-year bracket must not change this year's ranks. Test in Task 3 (second year fixture).

---

### Task 1: `stats` schema, refresh log, fingerprint, test helpers

**Files:**
- Create: `supabase/migrations/<ts>_create_stats_schema.sql`
- Modify: `supabase/tests/database/00_helpers.test.sql` (add helpers before `select plan(...)`, bump the plan count, add `has_function` checks for them)
- Test: `supabase/tests/database/12_stats_schema.test.sql`

**Interfaces:**
- Produces:
  - schema `stats`. `alter default privileges for role postgres in schema stats revoke execute on functions from public`, and revoke all on the schema from `public`, `anon`, `authenticated`, `service_role`.
  - table `stats.refresh_log(job text primary key, fingerprint jsonb not null, refreshed_at timestamptz not null)`, no grants
  - `stats.inputs_fingerprint() returns jsonb`: keys `brackets`, `brackets_max_created`, `games`, `games_max_created`, `picks`, `picks_max_created` (row counts and `max(created_at)` of `user_brackets`, `tournament_games`, `user_picks`)
  - `stats.inputs_changed(p_job text) returns boolean`: true when there's no log row for `p_job` or its fingerprint differs from `stats.inputs_fingerprint()`
  - `stats.record_refresh(p_job text) returns void`: upserts the current fingerprint, `refreshed_at = clock_timestamp()`
  - test helpers (schema `tests`, `security invoker`, return the new id):
    - `tests.create_played_game(p_year_id uuid, p_round_id uuid, p_favored uuid, p_favored_seed int, p_underdog uuid, p_underdog_seed int, p_winner uuid, p_is_play_in boolean default false) returns uuid`
    - `tests.create_pick(p_bracket_id uuid, p_game_id uuid, p_team_id uuid, p_seed int) returns uuid`
    - `tests.create_bracket_with_score(p_user_id uuid, p_year_id uuid, p_score int, p_created_at timestamptz) returns uuid`: needs scoring rules for the year, as `tests.create_bracket` does

- [ ] **Step 1: Write `12_stats_schema.test.sql`** (`begin; ... rollback;`, as in `10_rpc_team_stats.test.sql`):
  - `has_schema('stats')`. `has_table('stats','refresh_log')`.
  - `ok(not has_schema_privilege(r, 'stats', 'usage'))` for each of `anon`, `authenticated`, `service_role`.
  - On an empty DB, `stats.inputs_fingerprint()->>'brackets' = '0'`.
  - `stats.inputs_changed('t')` is true, then `perform stats.record_refresh('t')` -> false. After `tests.create_bracket(...)` -> true. Record again -> false. After `tests.create_pick(...)` on that bracket -> true. After `delete from public.user_brackets` -> true (count changed).
- [ ] **Step 2:** `npx supabase db reset; npx supabase test db`. Expected: 12 fails (`schema "stats" does not exist`), 00 fails on the missing helpers. Everything else passes.
- [ ] **Step 3: Write the migration and helpers** per the Interfaces block.
- [ ] **Step 4:** Rerun the suite. Expected: all pass.
- [ ] **Step 5: Commit** `feat(db): add private stats schema with refresh fingerprint`.

### Task 2: `stats.refresh_user_bracket_stats()`

**Files:**
- Create: `supabase/migrations/<ts>_refresh_user_bracket_stats.sql`
- Test: `supabase/tests/database/13_refresh_user_bracket_stats.test.sql`

**Interfaces:**
- Consumes: `stats.inputs_changed`, `stats.record_refresh` (job name `'user_bracket_stats'`), the Task 1 test helpers.
- Produces: `stats.refresh_user_bracket_stats() returns boolean`. It returns false (without writing) when inputs are unchanged, otherwise it upserts one row per bracket with a non-null `user_id` (on conflict `bracket_id`) and returns true. Bracket rows with no picks get zeros, `champion_picked_team_id = null`, `champion_correct = false`. It deletes `user_bracket_stats` rows whose bracket no longer has a `user_id`. Champion = the pick on the resolved `'finals'` game (latest pick by `created_at` if several).

- [ ] **Step 1: Write the test.** First, on an empty DB, the function returns true and `user_bracket_stats` is empty (Review Focus 2). Fixture: year Y, rounds `'1'`, `'2'`, `'finals'`; teams A-F; user U1; one anon bracket.

  | game | round | favored (seed) | underdog (seed) | winner | play-in |
  |---|---|---|---|---|---|
  | g1 | 1 | A (1) | B (16) | B | no |
  | g2 | 1 | C (4) | D (13) | C | no |
  | g3 | 1 | E (16) | F (16) | E | yes |
  | g4 | 1 | A (8) | C (8) | C | no |
  | g5 | finals | C (4) | B (16) | C | no |
  | g6 | 2 | A (1) | D (13) | null | no |
  | g7 | 2 | A (1) | D (13) | A | no |

  Bracket b1 (U1) picks: g1->B(16), g2->D(13), g3->E(16), g4->C(8), g5->C(4), g6->A(1), g7->null. Bracket b2 (U1): no picks. The anon bracket picks g1->A.

  Assert with `results_eq` on `(games_played, correct_picks, incorrect_picks, first_round_upsets_picked, first_round_upsets_correct, champion_picked_team_id, champion_correct)`:
  - b1 = `(6, 4, 1, 2, 1, C, true)`. Change 1: g3 and g4 are not upsets. g6 is skipped as unresolved. g7's null pick is neither correct nor incorrect.
  - b2 = `(0, 0, 0, 0, 0, null, false)`. No row for the anon bracket.
  - The second call returns false. After `tests.create_pick(b2, g5, B, 16)`, the next call returns true and b2 = `(1, 0, 1, 0, 0, B, false)` (Review Focus 1).
- [ ] **Step 2:** Run the suite. Expected: 13 fails (`function stats.refresh_user_bracket_stats() does not exist`).
- [ ] **Step 3: Write the migration** (plus `revoke execute ... from public, anon, authenticated, service_role` as belt and braces).
- [ ] **Step 4:** Run the suite. Expected: all pass.
- [ ] **Step 5: Commit** `feat(db): compute user bracket stats in SQL`.

### Task 3: `stats.refresh_user_total_stats()`

**Files:**
- Create: `supabase/migrations/<ts>_refresh_user_total_stats.sql`
- Test: `supabase/tests/database/14_refresh_user_total_stats.test.sql`

**Interfaces:**
- Consumes: Task 1 (job name `'user_total_stats'`).
- Produces: `stats.refresh_user_total_stats() returns boolean`, with the same skip contract as Task 2. It writes one row per `(user_id, year_id)` with brackets (on conflict `user_id, year_id`) and deletes rows for pairs with no brackets left. Column rules:
  - `total_brackets`, `high_score`, `low_score` from `user_brackets.score`.
  - Brackets ordered `created_at desc, id desc`. `average_score` and `last_three_average_score` (latest 3) when the user has ≥5 brackets that year, else 0. `last_ten_average_score` (latest 10) when ≥10, else 0.
  - Ranks per year use `rank()` desc: `high_score_rank` and `champions_guessed_correctly_rank` over all users. `average_score_rank` only for users with ≥5 brackets, else null.
  - Pick columns count resolved picks only: `total_picks`, `total_correct_picks`, the per-round `total_*_picked` / `*_guessed_correctly` / `*_percentage` (note the existing column name `rounds_ones_guessed_correctly`), first-round upsets, `champions_guessed_correctly` and `champion_correct_percentage` (finals). Round `'1'` counts exclude play-ins.
  - `top_picked_champion_id` / `total_top_picked_champion_picks`: the most-picked team on resolved finals picks. `top_picked_conference_id` / `total_top_picked_conference_picks`: the most-picked `teams.conference_id` over resolved picks, ignoring null teams and conferences. Tie-break: `count desc, max(user_picks.created_at) desc, max(user_brackets.created_at) desc, id asc`. Null id and null count when there are no such picks.

- [ ] **Step 1: Write the test.** Fixture: year Y (and Y2); rounds `'1'`, `'finals'`; conferences Power, Mid; teams A (Power), B (Mid), C (Power), D (Mid). Games: g1 R1 A(1) v B(16) won by B; g2 R1 C(4) v D(13) won by C; g5 finals C(4) v B(16) won by C; g6 R1 A(1) v D(13) unresolved. Brackets via `create_bracket_with_score`, `created_at = '2026-01-01'::timestamptz + n * interval '1 hour'`:
  - U1, year Y: 11 brackets with scores 10, 20, ..., 110 (n = 1..11, so 110 is newest). Picks: newest bracket (110): g1->B(16), g2->D(13), g5->C(4), g6->A(1). Second newest (100): g5->B(16).
  - U2, year Y: scores 500, 300.
  - U3, year Y: 5 brackets, each score 60.
  - U1, year Y2: one bracket, score 999.

  Expected for U1/Y:
  - totals: `total_brackets` 11, high 110, low 10, `average_score` 60, last three 100, last ten 65.
  - ranks: `high_score_rank` 2, `average_score_rank` 1 (tie with U3), `champions_guessed_correctly_rank` 1.
  - picks: `total_picks` 4, `total_correct_picks` 2, `correct_pick_percentage` 50.0.
  - round 1: picked 2, correct 1, 50.0. First-round upsets: picked 2, correct 1, 50.0.
  - champions: guessed correctly 1, `champion_correct_percentage` 50.0. `top_picked_champion_id` C (1-1 tie, newer bracket wins, change 8), `total_top_picked_champion_picks` 1.
  - `top_picked_conference_id` Mid, `total_top_picked_conference_picks` 3.

  Expected for the others:
  - U2/Y: high 500 rank 1, `average_score` 0, `average_score_rank` null (change 6), last three 0, `champions_guessed_correctly_rank` 2, `top_picked_champion_id` null.
  - U3/Y: `average_score` 60, rank 1, last three 60, last ten 0, `high_score_rank` 3.
  - U1/Y2: `high_score_rank` 1 (Review Focus 5).

  Then `delete from public.user_brackets where user_id = U2`, call again -> true, and U2/Y has no row.
- [ ] **Step 2:** Run the suite. Expected: 14 fails (function missing).
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4:** Run the suite. Expected: all pass.
- [ ] **Step 5: Commit** `feat(db): compute user total stats in SQL with ordered averages`.

### Task 4: `stats.refresh_global_team_stats()`

**Files:**
- Create: `supabase/migrations/<ts>_refresh_global_team_stats.sql`
- Test: `supabase/tests/database/15_refresh_global_team_stats.test.sql`

**Interfaces:**
- Produces: `stats.refresh_global_team_stats() returns void` (no skip check). It upserts one row per `public.teams` row (on conflict `year_id, team_id`), zeros when there's no activity. Column rules:
  - `picks`: all picks of the team.
  - `tournament_points_scored`: sum of the round's `tournament_round_scoring.score` (latest `created_at` if several, 0 if none) over resolved, non-play-in games the team won.
  - `championships`: finals games won.
  - Round appearances count games the team played in that round, resolved or not: `second_rounds` ('2'), `sweet_sixteens`, `elite_eights`, `final_fours`, `finals`.
  - `tournament_appearances` (change 11a): non-play-in `'1'` games played + resolved play-in games lost.
  - `upsets_caused` / `times_upset`: resolved, non-play-in games with unequal seeds that the underdog won.

- [ ] **Step 1: Write the test.** Fixture: year Y; rounds `'1'`, `'2'`, `'sweet sixteen'`, `'finals'`; scoring rows only for `'1'` = 10 and `'finals'` = 320; teams A, B, C, E, F, G (all in one conference; Task 5 reassigns). Games:

  | game | round | favored (seed) | underdog (seed) | winner | play-in |
  |---|---|---|---|---|---|
  | gp | 1 | E (16) | F (16) | E | yes |
  | g1 | 1 | A (1) | E (16) | E | no |
  | g2 | 1 | C (8) | B (8) | B | no |
  | gs | sweet sixteen | A (1) | B (8) | A | no |
  | gf | finals | C (8) | E (16) | C | no |
  | gu | 2 | A (1) | C (8) | null | no |

  One bracket with picks g1->A, gf->C, gu->C.

  Expected `(picks, points, championships, finals, sweet_sixteens, second_rounds, appearances, upsets_caused, times_upset)`:
  - A `(1, 0, 0, 0, 1, 1, 1, 0, 1)`. Points are 0 because sweet sixteen has no scoring row (Review Focus 2).
  - B `(0, 10, 0, 0, 1, 0, 1, 0, 0)`. The equal-seed win isn't an upset.
  - C `(2, 320, 1, 1, 0, 1, 1, 0, 0)`. Only gf scores; g2 was a loss.
  - E `(0, 10, 0, 1, 0, 0, 1, 1, 0)`. Play-in points are excluded, and E isn't double-counted (change 11a).
  - F `(0, 0, 0, 0, 0, 0, 1, 0, 0)`. A play-in loser still made the field.
  - G: all zeros.
- [ ] **Step 2:** Run the suite. Expected: 15 fails (function missing).
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4:** Run the suite. Expected: all pass.
- [ ] **Step 5: Commit** `feat(db): compute global team stats in SQL`.

### Task 5: `stats.refresh_global_conference_stats()`

**Files:**
- Create: `supabase/migrations/<ts>_refresh_global_conference_stats.sql`
- Test: `supabase/tests/database/16_refresh_global_conference_stats.test.sql`

**Interfaces:**
- Produces: `stats.refresh_global_conference_stats() returns void`. Rows are keyed `(teams.year_id, teams.conference_id)`, teams with null conference are skipped.
  - `wins` / `losses` come from resolved games, play-ins included (change 10, change 11a).
  - `picks` counts all picks of the conference's teams.
  - It upserts (on conflict `year_id, conference_id`) only the pairs with activity, and deletes rows for pairs without activity.

- [ ] **Step 1: Write the test.** Fixture: as Task 4, but conferences A Power, B Mid, C Power, E Mid, F Mid, G Mid, plus team N with null conference. Add game gn: R1 N(5) v B(12) won by N. Add pick gn->N. Pre-insert a `global_conference_stats` row for Y and conference Z (exists, no teams). Expected:
  - Mid: wins 3, losses 4, picks 0. Wins are gp E, g1 E and g2 B; losses are gp F, gs B, gf E and gn B.
  - Power: wins 2, losses 2, picks 3. Wins are gs and gf; losses are g1 and g2.
  - No Z row. No row with a null conference (Review Focus 3).
- [ ] **Step 2:** Run the suite. Expected: 16 fails.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4:** Run the suite. Expected: all pass.
- [ ] **Step 5: Commit** `feat(db): compute global conference stats in SQL`.

### Task 6: `stats.refresh_seed_matchup_stats()`

**Files:**
- Create: `supabase/migrations/<ts>_refresh_seed_matchup_stats.sql`
- Test: `supabase/tests/database/17_refresh_seed_matchup_stats.test.sql`

**Interfaces:**
- Produces: `stats.refresh_seed_matchup_stats() returns void`. It groups resolved, non-play-in games by `(year_id, round_id, favored_team_seed as higher_seed, underdog_team_seed as lower_seed)`.
  - `higher_seed_wins` counts favored wins and `lower_seed_wins` counts underdog wins. `total_games` is their sum.
  - `upset_percentage = round(100.0 * lower_seed_wins / total_games, 1)`.
  - It upserts on the unique four-column key and deletes rows not in the computed set.

- [ ] **Step 1: Write the test.** Games:
  - gp: play-in (16, 16), excluded.
  - Two R1 (1, 16) games, one won by each side.
  - An R1 (8, 8) game won by the underdog.
  - An R2 (1, 8) game, unresolved.

  Pre-insert a stale row (Y, R2, 2, 15). Expected exactly two rows:
  - (R1, 1, 16): higher wins 1, lower wins 1, total 2, upset 50.0.
  - (R1, 8, 8): higher wins 0, lower wins 1, total 1, upset 100.0.
- [ ] **Step 2:** Run the suite. Expected: 17 fails.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4:** Run the suite. Expected: all pass.
- [ ] **Step 5: Commit** `feat(db): compute seed matchup stats in SQL`.

### Task 7: `stats.add_current_year()`

**Files:**
- Create: `supabase/migrations/<ts>_add_current_year.sql`
- Test: `supabase/tests/database/18_add_current_year.test.sql`

**Interfaces:**
- Produces: `stats.add_current_year() returns void`. It inserts `extract(year from now() at time zone 'utc')::int` into `public.years`, then a `public.tournament_scoring_rules` row for it, both `on conflict do nothing`. The description and version are copied verbatim from `supabase/functions/inset-new-year/description.ts`: version `'1.0.0'`, and the description string exactly as in that file, typos included.

- [ ] **Step 1: Write the test.**
  - After one call: one `years` row for the current UTC year, and one rules row with `version = '1.0.0'` and the description starting `'This bracket is calculated based off of a 64 team bracket'`.
  - A second call leaves both counts at 1.
  - A pre-existing rules row with `description = 'keep'` is not overwritten: run this case in a fresh section, creating the year and rules with `tests.create_year` / `tests.create_scoring_rules` first.
- [ ] **Step 2:** Run the suite. Expected: 18 fails.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4:** Run the suite. Expected: all pass.
- [ ] **Step 5: Commit** `feat(db): add current year in SQL`.

### Task 8: Re-point cron jobs, privilege sweep, rollback file, docs

**Files:**
- Create: `supabase/migrations/<ts>_schedule_stats_jobs_in_sql.sql`
- Create: `supabase/rollback/restore_edge_function_cron.sql` (not a migration, never auto-applied)
- Test: `supabase/tests/database/19_stats_cron_and_privileges.test.sql`
- Modify: `supabase/cron/jobs.md`, `docs/DIAGNOSIS.md` (finding 23, roadmap 5b row), `CLAUDE.md` (Database section)

**Interfaces:**
- Consumes: all `stats.*` functions above.
- Produces: six pg_cron jobs, each via `cron.schedule(job_name, schedule, command)`. Hosted jobs are owned by `postgres` (verified read-only 2026-11-09), so same-name scheduling replaces them.

  | job name (exact) | schedule | command |
  |---|---|---|
  | `Add New Year Cron Job` | `0 6 1 1 *` | `select stats.add_current_year()` |
  | `Calculate Global Conference Stats` | `0 0 * * *` | `select stats.refresh_global_conference_stats()` |
  | `Calculate Global Team Stats` | `0 */12 * * *` | `select stats.refresh_global_team_stats()` |
  | `Calculate Seed Matchup Stats` | `0 0 * * *` | `select stats.refresh_seed_matchup_stats()` |
  | `Calculate User Bracket Stats` | `*/30 * * * *` | `select stats.refresh_user_bracket_stats()` |
  | `Calculate User Total Stats` | `*/30 * * * *` | `select stats.refresh_user_total_stats()` |

- [ ] **Step 1: Write the test.**
  - `results_eq` on `select jobname, schedule, command from cron.job order by jobname` against the table above.
  - `is_empty` on cron commands matching `'%net.http_post%'`.
  - `is_empty` on `stats` functions where `has_function_privilege(r, p.oid, 'execute')` for any of `anon`, `authenticated`, `service_role`.
  - `ok(not has_table_privilege(r, 'stats.refresh_log', 'select'))` for the same roles.
- [ ] **Step 2:** Run the suite. Expected: 19 fails on the cron check. The privilege checks may already pass, which is fine.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4:** Run the suite. Expected: all pass.
- [ ] **Step 5: Write the rollback file.** It contains six `cron.schedule` calls restoring each job's old `net.http_post(...)` command, copied from the current `supabase/cron/jobs.md`. Copy those commands before Step 6 edits the file. Check it locally:
  1. Run `docker exec -i supabase_db_march-madness-game psql -U postgres -d postgres < supabase/rollback/restore_edge_function_cron.sql`.
  2. Run `select jobname, command from cron.job` the same way. Expected: six `net.http_post` commands.
  3. Run `npx supabase db reset` to restore.
- [ ] **Step 6: Update docs.**
  - `jobs.md`: new commands. The jobs are now managed by migration `<ts>_schedule_stats_jobs_in_sql.sql`, and the rollback file path goes here.
  - DIAGNOSIS finding 23: say the stats work moved to `stats.*` SQL functions, the cron jobs no longer call Edge Functions, and the Edge Functions are pending deletion.
  - DIAGNOSIS roadmap 5b row: in progress.
  - CLAUDE.md: stats jobs live in the private `stats` schema (not exposed to the Data API), and `supabase/functions/` is retired pending deletion.
- [ ] **Step 7: Full verification** (superpowers:verification-before-completion): `npx supabase db reset; npx supabase test db` all pass, then `npm run lint`, `npx tsc --noEmit`, `npx vitest run` (unchanged, still green).
- [ ] **Step 8: Commit** `feat(db): run stats cron jobs in SQL instead of Edge Functions`, then push and open the PR. Its body lists spec changes 1-12 and 11a, and says that merging re-points the hosted cron jobs.

---

## Release (owner-gated; not for subagents)

1. **Merge** (owner's OK) -> `deploy-migrations.yml` applies the migrations to the hosted project.
2. **Verify read-only** via Supabase MCP:
   - `cron.job` shows the new commands.
   - After the next :00/:30, `cron.job_run_details` shows `succeeded` for both 30-minute jobs.
   - `user_bracket_stats` / `user_total_stats` `updated_at` has advanced.
   - Spot-check one user's `last_ten_average_score` and ranks.
3. **Soak about a week**, until each daily job has succeeded and the owner has checked the dashboard. If anything is wrong: apply `supabase/rollback/restore_edge_function_cron.sql` as a new migration (owner's OK).
4. **Delete the Edge Functions** (owner's explicit OK at the time): `npx supabase functions delete <name> --project-ref mowmxsorkncjycsomqpn` for all six. Then open a follow-up PR that removes `supabase/functions/` and the rollback file and marks finding 23 / step 5b done.
