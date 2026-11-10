---
paths:
  - "supabase/**"
  - "infrastructure/db/**"
  - "models/**"
  - "types/database.ts"
  - "scripts/db/**"
---
# Database (Supabase / Postgres)

## Schema and migrations

- Baseline schema (tables, RPC functions, RLS policies, grants) is in `supabase/migrations/20261103195820_remote_schema.sql`, dumped from the hosted project - keep it an exact mirror; put changes in new migrations.
- Tables: `years`, `teams`, `conferences`, `rounds`, `tournament_scoring_rules`, `tournament_round_scoring`, `user_brackets`, `tournament_games`, `user_picks`, `user_bracket_stats`, `user_total_stats`, `global_team_stats`, `global_conference_stats`, `seed_matchup_stats`, `profiles`.
- Most dashboard stats come from Postgres RPC functions (`get_top_performing_teams_by_year`, `get_top_picked_teams_by_year`, etc.) called via `supabase.rpc(...)`.
- All repositories currently use the **service-role** client (bypasses RLS); the cookie-based `supabaseServer` client is used only to verify the logged-in user.
- Migrations auto-apply to production on merge to `main` via `.github/workflows/deploy-migrations.yml`, so each one must work with the currently deployed app code.
- Clients write `user_brackets` through column-level grants, so a new `user_brackets` column needs an explicit column grant before client inserts/updates can set it.

## Generated types

- `types/database.ts` is generated from the local database by `npm run db:types` (`scripts/db/generate-types.mjs`, which runs `npx supabase gen types typescript --local --schema public`). Never edit it by hand. It is committed with LF endings (`.gitattributes`).
- After adding or changing a migration: `npx supabase db start` (or `npx supabase db reset` if the DB is already running), then `npm run db:types`, and commit `types/database.ts` in the same PR. CI's `db-tests` job runs `npm run db:types:check` and fails if the committed file is stale.
- A failed generation (DB not running) exits non-zero and leaves the committed file untouched.
- The three Supabase clients (`supabaseClient.ts`, `supabaseServer.ts`, `supabaseServiceRole.ts`) and every repository are typed with `Database`, so a misspelled table, column, RPC name or RPC argument fails `tsc`.
- `models/appStatsData` types are aliases of the generated types, not hand-written shapes:
  - Row types keep the existing names: `XSupabase = Tables<"table">`.
  - Inserts use `XInsertSupabase = TablesInsert<"table">` (`PickInsertSupabase` omits `game_id`, which is added after the game row is inserted).
  - RPC result models are built from `RpcRow<"function_name">` (`models/appStatsData/rpc.ts`).
- A new table or RPC the app reads gets an alias in `models/appStatsData` and a line in `tests/unit/models/databaseTypes.test.ts` (type-level; `tsc` checks it, not vitest).
- Repository casts (`as XSupabase`) are only for cases the typed client can't express; each needs a `// cast: <reason>` comment.

## CI token

The CI secret `SUPABASE_ACCESS_TOKEN` is a scoped personal access token for this project only. It needs connection-pooling config read (`database_pooling_config_read`) and storage config read on top of the database permissions; without pooling read, `supabase link` silently skips the pooler URL and `db push` then fails with a misleading IPv6 error. The token expires within a year, and its replacement needs the same permissions.

## Database tests

DB tests live in `supabase/tests/database/`: run `npx supabase db start` first, then `npx supabase test db` (local only). Files 01-11 depend on the helpers that `00_helpers.test.sql` commits, so run the whole suite rather than a single file on a fresh DB.

## Stats schema

Stats computation runs as SQL functions in the private `stats` schema (not exposed to the Data API; no EXECUTE for anon/authenticated/service_role), scheduled by pg_cron jobs created in migration `20261109211628_schedule_stats_jobs_in_sql.sql` (documented in `supabase/cron/jobs.md`).

- Every new `stats.*` function needs its own `revoke execute ... from public, anon, authenticated, service_role` (a per-schema default can't do it; test 19 enforces it).
- Stats upserts use an `IS DISTINCT FROM` guard so unchanged rows aren't rewritten.
- Open stats cost follow-ups: `docs/DIAGNOSIS.md` findings 27-30.
- `supabase/functions/` (the old stats Edge Functions) is retired and pending deletion; `supabase/rollback/restore_edge_function_cron.sql` is a manual, never-auto-applied rollback.

## Hosted project

- Never run writes, migrations, or destructive SQL against the hosted project without explicit confirmation. Claude's Supabase MCP server (`.mcp.json`) is read-only.
- To refresh the schema snapshot use `npx supabase db dump --remote=<ref> -p "$SUPABASE_DB_PASSWORD"` (read-only; password lives in `.env.local`) - not `db pull --remote`, which in CLI v3 also writes to the hosted migration history.
