# Database Tests, RLS Hardening and Migration Deploys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pgTAP suite that locks in every table's RLS behavior and every dashboard RPC, five test-first security fixes, a CI database job, and automatic migration deploys to the hosted project on merge.

**Architecture:** Tests live in `supabase/tests/database/*.test.sql` and run with `npx supabase test db` against a local Docker database built from `supabase/migrations/`. A helpers file (runs first, commits) installs pgTAP and a `tests` schema of fixture/role-switching functions; every other file is `BEGIN; ... ROLLBACK;`. Each security fix is its own small migration, written after its failing test. GitHub Actions gains a `db-tests` job and a `deploy-migrations` workflow.

**Tech Stack:** Postgres 17 (Supabase local), pgTAP, Supabase CLI v3 via `npx supabase` (version pinned by `package-lock.json`), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-03-database-tests-and-rls-design.md`

## Global Constraints

- Never edit `supabase/migrations/20261103195820_remote_schema.sql`; every change is a new migration created with `npx supabase migration new <name>`.
- Never pass `--linked` or `--db-url` to `supabase test db`. Tests run only against the local database.
- No writes to the hosted project (`mowmxsorkncjycsomqpn`) except the Task 12 steps, each confirmed by the owner at the time. Read-only inspection via the Supabase MCP server is fine.
- Never revoke anything from `service_role`.
- Every table in the baseline has `GRANT ALL` to `anon` and `authenticated`, so today a denial shows up as: SELECT returns 0 rows; INSERT raises SQLSTATE `42501` (RLS violation); UPDATE/DELETE silently affect 0 rows. After a privilege revoke, INSERT/UPDATE raise `42501` too. Write assertions against these exact modes.
- RPC expected values are worked out by hand from the fixture (they are given in this plan), never copied from running the function.
- If a test of "correct" behavior fails on the baseline, stop: it's either a new hole (add failing test + fix, note in `docs/DIAGNOSIS.md`) or a bug in a dashboard function (log in `DIAGNOSIS.md`, ask the owner, don't fix).
- Redact any key/token found in cron job commands before committing.
- Commits: conventional prefixes, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on branch `feat/db-tests-rls`.

## Review Focus

1. **Server writes after the revokes** - `service_role` must still insert/update `tournament_games`, `user_brackets` (including `score`) and `user_picks`. Tests added in Tasks 4, 5, 6.
2. **Anonymous bracket save** - `anon` inserting a bracket (no `RETURNING`, since `anon` has no SELECT policy) with the default score must keep working after column-level grants. Test in Task 6.
3. **Picks into an anonymous bracket** - a signed-in user inserting a pick into a bracket with `user_id IS NULL` must be denied (`NULL = auth.uid()` is not true). Test in Task 5.
4. **Fork PRs** - with no secrets, the dry-run step is skipped, not failed, and `supabase test db` still runs. Verified by inspection in Task 10 (can't be exercised locally).
5. **Test-order independence** - only the helpers file commits; running the suite twice in a row on the same database must be green both times. Check in Task 9.

---

## File Structure

```
supabase/
  tests/database/
    00_helpers.test.sql              tests schema: role switching + fixture builders (commits)
    01_reference_tables.test.sql     years, teams, conferences, rounds, scoring rules, seed stats, round scoring
    02_stats_tables.test.sql         global_*_stats, user_bracket_stats, user_total_stats
    03_profiles.test.sql             sign-up + username check guards, profile delete/update
    04_tournament_games.test.sql     fix (b)
    05_user_picks.test.sql           fix (a)
    06_user_brackets.test.sql        fix (c)
    07_update_policies.test.sql      fix (d)
    08_debug_function.test.sql       fix (e)
    10_rpc_team_stats.test.sql       12 team-stat RPCs
    11_rpc_other.test.sql            3 conference RPCs, seed-matchup RPC, per-user picks RPC
  migrations/
    <ts>_lock_tournament_games_writes.sql
    <ts>_restrict_user_picks_insert.sql
    <ts>_protect_user_brackets_score.sql
    <ts>_add_using_to_update_policies.sql
    <ts>_drop_debug_auth_context.sql
  functions/<slug>/...               downloaded Edge Function source (6)
  cron/jobs.md                       pg_cron job definitions, secrets redacted
.github/workflows/ci.yml             + db-tests job
.github/workflows/deploy-migrations.yml
CLAUDE.md, docs/DIAGNOSIS.md         notes
```

---

### Task 1: Test harness and helpers

**Files:**
- Create: `supabase/tests/database/00_helpers.test.sql`

**Interfaces:**
- Produces (all in schema `tests`, `SECURITY INVOKER`, plpgsql, idempotent via `create or replace`):
  - `tests.create_user(p_email text) returns uuid` - inserts into `auth.users` (`id gen_random_uuid()`, `email`, `aud='authenticated'`, `role='authenticated'`, `instance_id='00000000-0000-0000-0000-000000000000'`).
  - `tests.authenticate_as(p_user_id uuid, p_extra_claims jsonb default '{}') returns void` - `set_config('role','authenticated',true)` and `set_config('request.jwt.claims', ({"sub":p_user_id,"role":"authenticated"} || p_extra_claims)::text, true)`.
  - `tests.authenticate_as_anon() returns void` - role `anon`, claims `{"role":"anon"}`.
  - `tests.authenticate_as_service_role() returns void` - role `service_role`, claims `{"role":"service_role"}`.
  - `tests.clear_authentication() returns void` - role `postgres`, claims `''`.
  - `tests.create_year(p_year int) returns uuid`
  - `tests.create_scoring_rules(p_year_id uuid) returns uuid`
  - `tests.create_round(p_name text) returns uuid`
  - `tests.create_conference(p_name text, p_is_power boolean, p_logo text default null) returns uuid`
  - `tests.create_team(p_name text, p_year_id uuid, p_conference_id uuid, p_logo text default null) returns uuid`
  - `tests.create_game(p_year_id uuid, p_round_id uuid) returns uuid`
  - `tests.create_bracket(p_user_id uuid, p_year_id uuid) returns uuid` - for a logged-in owner; creates nothing else, caller passes a year that already has scoring rules (looks up `tournament_scoring_rules` by year).
  - `tests.create_anon_bracket(p_anon_user_id uuid, p_year_id uuid) returns uuid`
  - Fixture builders must be called while role is `postgres` (call `tests.clear_authentication()` first).

- [ ] **Step 1: Check Docker and start the local database**

Run: `docker info --format '{{.ServerVersion}}'` then `npx supabase db start`
Expected: a version number; database starts. Then run `npx supabase migration list --local` and confirm `20261103195820` is applied. If it isn't, use `npx supabase db reset` after `db start` (here and in CI, Task 10). If the baseline fails on missing `auth` objects, use `npx supabase start -x studio,imgproxy,inbucket,realtime,storage-api,edge-runtime,logflare,vector,supavisor` instead and record which command worked.

- [ ] **Step 2: Write the helpers file with one smoke assertion block**

File structure: `begin; create extension if not exists pgtap with schema extensions; create schema if not exists tests; grant usage on schema tests to anon, authenticated, service_role;` then the functions above, then:

```sql
select plan(3);
select has_table('public', 'user_brackets', 'baseline schema is loaded');
select has_function('tests', 'authenticate_as', array['uuid','jsonb'], 'helpers installed');
select is(
  (select tests.create_user('smoke@test.dev') is not null), true, 'can create auth users');
select * from finish();
commit;
```

(The smoke user is harmless: other files never assert on total user counts.)

- [ ] **Step 3: Run the suite**

Run: `npx supabase test db`
Expected: `00_helpers.test.sql .. ok`, `All tests successful.`

- [ ] **Step 4: Commit**

```bash
git add supabase/tests/database/00_helpers.test.sql
git commit -m "test: add pgTAP harness and fixture helpers for database tests"
```

---

### Task 2: Characterize reference and stats table policies

**Files:**
- Create: `supabase/tests/database/01_reference_tables.test.sql`, `supabase/tests/database/02_stats_tables.test.sql`

**Interfaces:** Consumes Task 1 helpers. Each file: `begin; select plan(N); <fixture as postgres>; <assertions>; select * from finish(); rollback;`

These describe current behavior and must pass on the baseline.

- [ ] **Step 1: Write `01_reference_tables.test.sql`**

Fixture: one year, rules, round, conference, team, game, one `seed_matchup_stats` row, one `tournament_round_scoring` row; users A.

| Table | Assertion |
|---|---|
| `years`, `teams`, `conferences`, `rounds`, `tournament_games`, `tournament_scoring_rules`, `seed_matchup_stats` | as `anon` and as A: `select count(*)` = fixture count (1) |
| `tournament_scoring_rules`, `seed_matchup_stats` | as A and as `anon`: insert `throws_ok(..., '42501')` (`no_direct_inserts`) |
| `years`, `teams`, `conferences`, `rounds` | as A: insert `throws_ok(..., '42501')` (no insert policy) |
| `tournament_round_scoring` | as `anon`: 0 rows; as A with no `user_role`: 0 rows; as A with `{"user_role":"admin"}`, `"scorer"`, `"organizer"`: 1 row each; with `{"user_role":"player"}`: 0 rows |

- [ ] **Step 2: Write `02_stats_tables.test.sql`**

Fixture: users A and B, one year, one team, one conference, one bracket each; one `global_team_stats`, one `global_conference_stats` row; one `user_bracket_stats` and one `user_total_stats` row for each of A and B.

| Table | anon | A |
|---|---|---|
| `global_team_stats`, `global_conference_stats` | 0 rows | 1 row |
| `user_bracket_stats`, `user_total_stats` | 0 rows | 1 row, and it is A's (`user_id = A`) |
| all four | - | insert `throws_ok(..., '42501')` |

- [ ] **Step 3: Run**

Run: `npx supabase test db`
Expected: all files ok. A failure here means the baseline differs from the spec's "believed correct" list - stop and follow the Global Constraints rule.

- [ ] **Step 4: Commit**

```bash
git add supabase/tests/database/01_reference_tables.test.sql supabase/tests/database/02_stats_tables.test.sql
git commit -m "test: characterize RLS on reference and stats tables"
```

---

### Task 3: Guard sign-up and the username check (profiles)

**Files:**
- Create: `supabase/tests/database/03_profiles.test.sql`

These are the spec's anti-goal guards; they must pass now and after every later task.

- [ ] **Step 1: Write the tests**

Fixture: users A, B; B's profile row (`username = 'bob'`) inserted as postgres.

- `useFieldAvailability`: as `anon`, `select count(*) from profiles where username = 'bob'` = 1, and `where username = 'nobody'` = 0.
- `useSignUp`: as A, `insert into profiles (id, username) values (A, 'alice')` `lives_ok`; then as A `select username from profiles where id = A` = `'alice'`.
- as A, insert a profile with a third user C's id (`values (C, 'mallory')`) `throws_ok(..., '42501')`.
- as `anon`, insert a profile `throws_ok(..., '42501')`.
- `profiles_delete_own`: as A, delete B's profile; back as postgres, B's row still exists. As A, delete own; row gone.

- [ ] **Step 2: Run** - `npx supabase test db`, expected all ok.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/database/03_profiles.test.sql
git commit -m "test: guard sign-up profile insert and username availability check"
```

---

### Task 4: Fix (b) - only service_role writes tournament_games

**Files:**
- Create: `supabase/tests/database/04_tournament_games.test.sql`
- Create: `supabase/migrations/<ts>_lock_tournament_games_writes.sql`

- [ ] **Step 1: Write the failing tests**

Fixture: user A, year, round, one game G.
- as A: insert a game `throws_ok(..., '42501')` - **fails on baseline** (policy is `WITH CHECK (true)`).
- as A: `update tournament_games set winning_team_id = null ...` - after the fix this raises `42501`; assert `throws_ok(..., '42501')` (on baseline it silently updates 0 rows, so the assertion fails).
- as A: delete G `throws_ok(..., '42501')`.
- as `anon`: insert `throws_ok(..., '42501')`.
- as `anon` and A: G still readable (1 row).
- Review Focus 1: as `service_role`: insert a game `lives_ok`, update G's scores `lives_ok`.

- [ ] **Step 2: Run, confirm the right failures** - `npx supabase test db`; expected failures: the authenticated insert, update and delete assertions only.

- [ ] **Step 3: Write the migration**

`drop policy "tournament_games_insert_authenticated" on public.tournament_games;` and `revoke insert, update, delete, truncate on public.tournament_games from anon, authenticated;`

- [ ] **Step 4: Run** - `npx supabase db reset` then `npx supabase test db`; expected all ok (including 03).

- [ ] **Step 5: Commit**

```bash
git add supabase/tests/database/04_tournament_games.test.sql supabase/migrations/*_lock_tournament_games_writes.sql
git commit -m "fix: allow only service_role to write tournament_games"
```

---

### Task 5: Fix (a) - picks only into your own bracket, same year

**Files:**
- Create: `supabase/tests/database/05_user_picks.test.sql`
- Create: `supabase/migrations/<ts>_restrict_user_picks_insert.sql`

- [ ] **Step 1: Write the tests**

Fixture: users A, B; years Y1, Y2 (each with rules); games G1 (Y1), G2 (Y1), G3 (Y2); brackets BA (A, Y1), BB (B, Y1), anon bracket BN (Y1); one existing pick by B in BB on G1.

Characterization (pass now): as A, `select` from `user_picks` sees 0 of B's picks; as A, delete B's pick, then as postgres it still exists; as `anon`, insert any pick `throws_ok(..., '42501')`.

Failing until fixed:
- as A, insert pick into BB on G2 `throws_ok(..., '42501')`.
- as A, insert pick into BA on G3 (other year) `throws_ok(..., '42501')`.
- Review Focus 3: as A, insert pick into BN on G2 `throws_ok(..., '42501')`.

Must keep working: as A, insert pick into BA on G1 `lives_ok`; Review Focus 1: as `service_role`, insert pick into BB on G2 `lives_ok`.

- [ ] **Step 2: Run, confirm only the three "failing until fixed" assertions fail.**

- [ ] **Step 3: Write the migration**

Drop `user_picks_insert_authenticated`; recreate it `for insert to authenticated with check (exists (select 1 from public.user_brackets b join public.tournament_games g on g.year_id = b.year_id where b.id = user_picks.bracket_id and g.id = user_picks.game_id and b.user_id = (select auth.uid())))`.

- [ ] **Step 4: Run** - `npx supabase db reset && npx supabase test db`; all ok.

- [ ] **Step 5: Commit** - `fix: restrict user_picks inserts to the user's own bracket and year`

---

### Task 6: Fix (c) - clients can't set or change a bracket's score

**Files:**
- Create: `supabase/tests/database/06_user_brackets.test.sql`
- Create: `supabase/migrations/<ts>_protect_user_brackets_score.sql`

Decision: column-level privileges (not a trigger) - no code runs per row, and `service_role` is untouched by construction.

- [ ] **Step 1: Write the tests**

Fixture: users A, B; year Y with rules; bracket BB owned by B.

Characterization (pass now):
- as A: sees only own brackets (0 of B's).
- as A: insert bracket with `user_id = B`, `anon_user_id` null `throws_ok(..., '42501')`.
- as `anon`: insert with `user_id = A`, `anon_user_id` null `throws_ok(..., '42501')`.
(Don't test both owners set - the `exactly_one_owner` CHECK constraint would muddy which error fires.)
- as A: delete BB; as postgres BB still exists.

Must keep working (Review Focus 2): as `anon`, `insert into user_brackets (anon_user_id, year_id, tournament_scoring_rules_id) values (...)` without `RETURNING` `lives_ok`; as A, insert own bracket without `score` `lives_ok` and the row's score is 0.

Failing until fixed:
- as A: insert own bracket with `score = 999` `throws_ok(..., '42501')`.
- as `anon`: insert with `score = 999` `throws_ok(..., '42501')`.
- as A: `update user_brackets set score = 999 where id = <A's bracket>` `throws_ok(..., '42501')`.

Review Focus 1: as `service_role`, update BB's score to 50 `lives_ok`, then score = 50.

- [ ] **Step 2: Run, confirm only the three score assertions fail.**

- [ ] **Step 3: Write the migration**

`revoke insert, update on public.user_brackets from anon, authenticated;` then `grant insert (id, user_id, year_id, tournament_scoring_rules_id, created_at, anon_user_id) on public.user_brackets to anon, authenticated;` and `grant update (year_id, tournament_scoring_rules_id, anon_user_id) on public.user_brackets to authenticated;`. Add a SQL comment: new columns on this table need an explicit column grant.

- [ ] **Step 4: Run** - `npx supabase db reset && npx supabase test db`; all ok.

- [ ] **Step 5: Commit** - `fix: block client writes to user_brackets.score`

---

### Task 7: Fix (d) - USING clauses on the three update policies

**Files:**
- Create: `supabase/tests/database/07_update_policies.test.sql`
- Create: `supabase/migrations/<ts>_add_using_to_update_policies.sql`

- [ ] **Step 1: Write the tests**

Fixture: users A, B; profiles for both; years Y and Y2, each with scoring rules; brackets BA (A, Y), BB (B, Y); games G1, G2 in Y; picks PA (BA, G1), PB (BB, G1).

Other user's row (expected to pass before and after - record the baseline result):
- as A, `update profiles set username = 'hacked' where id = B`; as postgres B's username unchanged.
- as A, `update user_brackets set year_id = Y2 where id = BB`; BB unchanged.
- as A, `update user_picks set game_id = G2 where id = PB`; PB unchanged.

Own row (the fix makes these work; on the baseline a policy with no `USING` likely matches no rows):
- as A, update own username to `'alice2'`; as postgres it is `'alice2'`.
- as A, update PA `game_id` to G2; PA changed.
- as A, update BA `tournament_scoring_rules_id` to the same value (no-op change) and assert `lives_ok` and the update reports 1 row: use `with u as (update ... returning 1) select count(*) from u` = 1.

- [ ] **Step 2: Run, and record the baseline result for each assertion in the commit message body** (which "other user" cases were already safe, which "own row" cases were broken). If any "other user" case fails on the baseline, that's a live hole - note it in `docs/DIAGNOSIS.md` finding 21.

- [ ] **Step 3: Write the migration**

For each of `user_brackets_update_authenticated`, `user_picks_update_own`, `profiles_update_own`: `alter policy ... using (<same expression as its WITH CHECK>)`. Use `(select auth.uid())`.

- [ ] **Step 4: Run** - `npx supabase db reset && npx supabase test db`; all ok.

- [ ] **Step 5: Commit** - `fix: add ownership USING clauses to update policies`

---

### Task 8: Fix (e) - drop debug_auth_context

**Files:**
- Create: `supabase/tests/database/08_debug_function.test.sql`
- Create: `supabase/migrations/<ts>_drop_debug_auth_context.sql`

- [ ] **Step 1: Test** - `select hasnt_function('public', 'debug_auth_context', 'leftover debug RPC is removed');`
- [ ] **Step 2: Run, expect that one failure.**
- [ ] **Step 3: Migration** - `drop function if exists public.debug_auth_context();`
- [ ] **Step 4: Run** - `npx supabase db reset && npx supabase test db`; all ok. Also `grep -r debug_auth_context app application infrastructure src utils` returns nothing.
- [ ] **Step 5: Commit** - `chore: drop leftover debug_auth_context RPC`

---

### Task 9: Dashboard RPC tests

**Files:**
- Create: `supabase/tests/database/10_rpc_team_stats.test.sql`, `supabase/tests/database/11_rpc_other.test.sql`

All RPCs are called after `tests.authenticate_as_service_role()`. Compare full ordered results with `results_eq` against `values` lists written from the tables below.

- [ ] **Step 1: Write `10_rpc_team_stats.test.sql`**

Fixture: years YA, YB. Conferences: `Power` (`is_power = true`), `Mid` (`false`). Teams T0..T5 in YA, each with logo `'logo-Ti'`; T0, T2, T4 in `Mid`, T1, T3, T5 in `Power`. Team TX in YB.
`global_team_stats` for YA: for metric index k and team Ti, value = `((i + k) % 6) + 1`. TX's YB row has 1000 in every metric.

| k | Function | Metric column | Expected team order (top 5) |
|---|---|---|---|
| 0 | `get_top_performing_teams_by_year` | `tournament_points_scored` | T5,T4,T3,T2,T1 |
| 1 | `get_teams_with_most_championships_by_year` | `championships` | T4,T3,T2,T1,T0 |
| 2 | `get_teams_with_most_finals_appearances_by_year` | `finals` | T3,T2,T1,T0,T5 |
| 3 | `get_teams_with_most_final_four_appearances_by_year` | `final_fours` | T2,T1,T0,T5,T4 |
| 4 | `get_teams_with_most_elite_eight_appearances_by_year` | `elite_eights` | T1,T0,T5,T4,T3 |
| 5 | `get_teams_with_most_sweet_sixteen_appearances_by_year` | `sweet_sixteens` | T0,T5,T4,T3,T2 |
| 6 | `get_teams_with_most_second_round_appearances_by_year` | `second_rounds` | T5,T4,T3,T2,T1 |
| 7 | `get_teams_with_most_tournament_appearances_by_year` | `tournament_appearances` | T4,T3,T2,T1,T0 |
| 8 | `get_teams_that_caused_most_upsets_by_year` | `upsets_caused` | T3,T2,T1,T0,T5 |
| 9 | `get_most_upset_teams_by_year` | `times_upset` | T2,T1,T0,T5,T4 |
| 10 | `get_top_picked_teams_by_year` | `picks` | T1,T0,T5,T4,T3 |

Assert each function's full result for `YA` equals `(team_id, 'Ti', 'logo-Ti', conference_id, value)` rows in that order (values 6,5,4,3,2) - this covers year filter, order, limit and join in one check.
Plus `get_top_performing_non_power_conference_teams_by_year(YA)` = T4 (5), T2 (3), T0 (1).

- [ ] **Step 2: Write `11_rpc_other.test.sql`**

Conferences (no teams needed), each with logo `'logo-<name>'`; `global_conference_stats` for YA, plus a YB row for N1 with wins = picks = 999:

| Conference | power | wins | picks |
|---|---|---|---|
| P1 | t | 70 | 10 |
| P2 | t | 60 | 70 |
| P3 | t | 50 | 20 |
| P4 | t | 40 | 60 |
| N1 | f | 30 | 50 |
| N2 | f | 20 | 30 |
| N3 | f | 10 | 40 |

- `get_top_performing_conferences_by_year(YA)` = P1 70, P2 60, P3 50, P4 40, N1 30
- `get_top_performing_non_power_conferences_by_year(YA)` = N1 30, N2 20, N3 10
- `get_top_picked_conferences_by_year(YA)` = N1 50, N3 40, N2 30 (non-power only, as-is - see DIAGNOSIS)

Seed matchups: rounds R1, R2. YA/R1 rows `(higher_seed h, lower_seed 17-h, upset_percentage h * 0.05)` for h = 1..8, plus `(2, 7, 0.01)`. Decoys: YA/R2 `(1, 8, 0.99)`, YB/R1 `(1, 16, 0.98)`.
- `get_seed_matchup_upset_percentages_by_year_and_round(YA, 'R1')` = 8 rows, h = 8 down to 1, each `(h*0.05, h, 17-h, R1)`.

Per-user picks: users A, B; YA has teams T0..T5 and games G1..G7; YB has one game GY. A has three YA brackets; distribute A's 21 picks over (3 brackets x 7 games) so the counts are T0 6, T1 5, T2 4, T3 3, T4 2, T5 1. B has one YA bracket with 7 picks of T5. A has one YB bracket with a pick of T5 on GY.
- `get_top_picked_teams_for_user_and_year(A, YA)` = T0 6, T1 5, T2 4, T3 3, T4 2.

- [ ] **Step 3: Run** - `npx supabase test db`; expected all ok. A mismatch is either a fixture mistake or a function bug - check the fixture first; if the function is wrong, log in `DIAGNOSIS.md` and ask.

- [ ] **Step 4: Review Focus 5** - run `npx supabase test db` a second time without resetting; expected all ok again.

- [ ] **Step 5: Commit** - `test: cover dashboard RPC functions with hand-computed fixtures`

---

### Task 10: CI database job (fork-safe dry-run)

**Files:**
- Modify: `.github/workflows/ci.yml` (add job after `check`)

- [ ] **Step 1: Add the `db-tests` job**

Name `Database tests`, `runs-on: ubuntu-latest`, `timeout-minutes: 20`. Job env: `SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}`, `SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}`. Steps:
1. `actions/checkout@v4` with `fetch-depth: 0`
2. `actions/setup-node@v4` (node 22, npm cache), `npm ci`
3. Start the database with the command recorded in Task 1, then `npx supabase test db`
4. `Preview production migrations`, with `if: github.event_name == 'pull_request' && env.SUPABASE_ACCESS_TOKEN != ''`. Script: if `git diff --quiet origin/${{ github.base_ref }}...HEAD -- supabase/migrations` then echo "No migration changes" and exit 0; else `npx supabase link --project-ref mowmxsorkncjycsomqpn -p "$SUPABASE_DB_PASSWORD"` and `npx supabase db push --dry-run -p "$SUPABASE_DB_PASSWORD"`.

No `paths` filter on the job.

- [ ] **Step 2: Validate** - `npx --yes actionlint .github/workflows/ci.yml` (or `docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint`); expected no errors. Re-read step 4's `if:` and confirm: secrets absent → `env.SUPABASE_ACCESS_TOKEN` is `''` → step skipped (Review Focus 4); `supabase test db` has no secret dependency.

- [ ] **Step 3: Commit** - `ci: run pgTAP database tests and preview migrations on PRs`

---

### Task 11: Deploy workflow, Edge Function and cron capture, docs

**Files:**
- Create: `.github/workflows/deploy-migrations.yml`
- Create: `supabase/functions/<slug>/**` (6), `supabase/cron/jobs.md`
- Modify: `CLAUDE.md`, `docs/DIAGNOSIS.md`

- [ ] **Step 1: Deploy workflow**

`on: push: branches: [main], paths: ['supabase/migrations/**']`; `concurrency: { group: deploy-migrations, cancel-in-progress: false }`; one job: checkout, setup-node 22, `npm ci`, `npx supabase link --project-ref mowmxsorkncjycsomqpn -p "$SUPABASE_DB_PASSWORD"`, `npx supabase db push --yes -p "$SUPABASE_DB_PASSWORD"`; env from the two secrets plus `SUPABASE_YES: "true"`. Validate with actionlint as in Task 10.

- [ ] **Step 2: Download Edge Functions (read-only)**

Ask the owner to run `! npx supabase login` if not logged in. Run `npx supabase functions list --project-ref mowmxsorkncjycsomqpn` for the 6 slugs, then `npx supabase functions download <slug> --project-ref mowmxsorkncjycsomqpn` for each. Expected: 6 folders under `supabase/functions/`. `grep -rniE "eyJ|service_role|sk_" supabase/functions` - any hardcoded secret gets redacted and noted.

- [ ] **Step 3: Capture cron jobs (read-only)**

Via Supabase MCP `execute_sql`: `select jobname, schedule, command, active from cron.job order by jobname;`. Write `supabase/cron/jobs.md`: one section per job (name, schedule, active, command in a sql block) with every `Authorization`/`apikey` header value replaced by `<REDACTED: service-role key, stored in hosted cron job / Vault>`; a header line saying this is documentation, not applied by any workflow. Expected: 6 jobs.

- [ ] **Step 4: Docs**

- `CLAUDE.md`, Database section: migrations auto-apply to production on merge to `main` via `deploy-migrations.yml`, so each must work with the currently deployed app code; DB tests live in `supabase/tests/database/` (`npx supabase test db`, local only).
- `docs/DIAGNOSIS.md`: finding 23 (Med) - all 6 Edge Functions have `verify_jwt: false`, so anyone can trigger stats recomputation; finding 24 (Low, suspected bug) - `get_top_picked_conferences_by_year` filters `is_power_conference = false` but the dashboard labels it "Top Picked Conference" and its siblings don't filter; roadmap row "5b - Edge Function tests + invocation lockdown" after step 5; step 5 row marked done once merged.

- [ ] **Step 5: Verify and commit**

Run: `npx supabase test db`, `npm run lint`, `npx vitest run` - all green.

```bash
git add .github/workflows/deploy-migrations.yml supabase/functions supabase/cron CLAUDE.md docs/DIAGNOSIS.md
git commit -m "ci: deploy migrations on merge; capture edge functions and cron jobs"
```

---

### Task 12: One-time hosted setup, PR and first deploy

Each hosted step needs the owner's explicit OK at the time it runs.

- [ ] **Step 1: Repair migration history (hosted write - ask first)**

`npx supabase link --project-ref mowmxsorkncjycsomqpn` then `npx supabase migration repair --status applied 20261103195820 -p "$SUPABASE_DB_PASSWORD"`.
Then `npx supabase db push --dry-run` - expected: lists exactly the five new migrations from Tasks 4-8, nothing else.

- [ ] **Step 2: Owner adds GitHub secrets** `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` (repo Settings → Secrets → Actions). Claude never sees the values.

- [ ] **Step 3: Open the PR** - `superpowers:verification-before-completion`, push, `gh pr create` against `main`. Expected in CI: `Lint, type-check, test` and `Database tests` green; the preview step lists the five migrations.

- [ ] **Step 4: Branch protection (ask first)** - require `Lint, type-check, test` and `Database tests` on `main` via `gh api`.

- [ ] **Step 5: After the owner merges** - watch `deploy-migrations` (`gh run watch`); then read-only via MCP: `select policyname from pg_policies where tablename in ('user_picks','tournament_games')` shows the new picks policy and no games insert policy, and `debug_auth_context` no longer exists. Sign up flow smoke check: owner signs up a test user on the deployed site.
