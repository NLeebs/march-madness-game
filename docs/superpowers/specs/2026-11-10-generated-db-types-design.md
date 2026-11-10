# Generated database types (roadmap step 4) - design

Status: approved by the owner in chat on 2026-11-10. Closes `docs/DIAGNOSIS.md` finding 16.

## Intent

The TypeScript side of the app describes database rows with hand-written types in `models/appStatsData/*Supabase.ts`. Nothing has broken because of them yet. The point of this step is prevention: migrations keep coming (step 9 adds a `persist_bracket` RPC), and a migration should never leave the app compiling against a schema that no longer exists. The owner explicitly wants **CI to fail** when a migration changes the schema and the types weren't regenerated, so drift can't reach production.

This step also starts restructuring `CLAUDE.md` into a light index plus path-scoped `.claude/rules/` files (modeled on `eti-vibe-apps/src/eti-budget`), beginning with the database area this step touches.

## What exists today (recon, 2026-11-10)

- 14 zod schemas in `models/appStatsData/` exist only to produce TS types (`z.infer`); nothing calls `.parse`/`.safeParse` on them. About 58 files import from `@/models/appStatsData` or `@/models`.
- 10 of them mirror tables; 4 mirror RPC return shapes (`ConferencePerformanceSupabase`, `SeedPerformanceSupabase`, `TeamPerformanceSupabase`, `TeamPickCountSupabase`).
- The 7 repositories in `infrastructure/db/` use untyped `SupabaseClient` and cast results with `as XSupabase` (26 casts).
- Two client hooks query Supabase directly: `src/hooks/useFieldAvailability.ts`, `src/hooks/useSignUp.ts`.
- Drift already present:
  - `UserTotalStatsSupabase` has `rounds_two_guessed_correctly` / `rounds_one_guessed_correctly`; the table columns are `round_twos_guessed_correctly` / `rounds_ones_guessed_correctly`. Only `tests/factories/userTotalStats.factory.ts` uses the wrong names.
  - `ConferenceSupabase` lacks `is_power_conference`.
  - About 40 columns are nullable in the DB but non-null in the models (most of `user_total_stats`; `tournament_games` team/seed/score/winner columns; `user_picks.picked_team_id`/`picked_team_seed`; `teams.conference_id`/`team_logo`; `conferences.conference_logo`; `profiles.username`; `tournament_scoring_rules.description`/`version`).
- `tsconfig.json` has `strict: false`, so null-related mismatches are invisible to `tsc` until step 12 turns strict checks on.
- CI (`.github/workflows/ci.yml`) already has a job that runs `npx supabase db start` (all migrations applied) and `npx supabase test db`. The Supabase CLI version is pinned through `package-lock.json` (`supabase` devDependency, `^3.0.0`).

## Goals

1. One generated file, `types/database.ts`, produced by `npx supabase gen types typescript --local --schema public` from a local DB with all migrations applied. It covers tables, views, enums and RPC function args/returns in `public`.
2. All three Supabase clients are typed with it: `createBrowserClient<Database>` (`infrastructure/db/supabaseClient.ts`), `createServerClient<Database>` (`supabaseServer.ts`), `createClient<Database>` (`supabaseServiceRole.ts`), and repositories hold `SupabaseClient<Database>`. Misspelled table, column or function names fail `tsc`.
3. The row types in `models/appStatsData/` become thin aliases derived from the generated types (one source of truth); their zod schemas are removed. Existing names (`BracketSupabase`, `GameSupabase`, `PickSupabase`, ...) become the **Row** type (`Tables<"x">`), so read paths get exact types. Code that builds inserts uses new insert names next to them, e.g. `BracketInsertSupabase = TablesInsert<"user_brackets">`, and for picks built before their game exists (`application/mappers/mapTournamentToRows.ts` fills `game_id` later) `Omit<TablesInsert<"user_picks">, "game_id">` or similar. Touching the insert sites (`mapTournamentToRows`, `TournamentRepository.persistBracket` / `PersistTournamentData`, the related factories and tests) is expected; other importers should not need changes. RPC models use the function's `Returns` element type (several RPCs share one model, e.g. `TeamPerformanceSupabase`; derive it from their generated `Returns` types). *(Builder-check answer, Claude's call: Row aliases keep the names; insert shapes get new names.)*
4. Repository casts are removed wherever the typed client already returns the right type. A cast that remains needs a one-line comment saying why.
5. **CI drift guard (owner's decision):** in the existing DB job, after `supabase db start`, regenerate `types/database.ts` and fail the job if it differs from the committed file, with an error message that says how to regenerate.
6. Existing drift is fixed: the misspelled `user_total_stats` fields (and the factory), the missing `is_power_conference`, and nullability now matches the DB.
7. First rules file: the "Database (Supabase / Postgres)" section of `CLAUDE.md` moves into `.claude/rules/database.md` with `paths:` frontmatter covering `supabase/**`, `infrastructure/db/**`, `models/**`, `types/database.ts`. It includes how and when to regenerate types. `CLAUDE.md` keeps a short pointer and gains a "Rule index" table (Topic | Rule file | Loads when you touch), in the style of eti-budget. eti-budget conventions (read 2026-11-10 at `C:\Users\Nathan.Lieberman\Documents\GDIrepos\eti-vibe-apps\src\eti-budget`): each rule file starts with YAML frontmatter holding only `paths:`, a list of quoted repo-relative globs (`"supabase/**"`), then a `# Title` and the rules as short sections; `CLAUDE.md` says "Rules load automatically when you touch matching files. Before designing or planning a change, read the rule files for every topic it touches." above the index, and keeps any invariant that must never be broken as a one-line bullet with a `→ .claude/rules/<file>.md` pointer. An exact match is not required.
8. Docs ship in this same PR (owner: no docs-only PRs): this spec, the plan, a DIAGNOSIS update (finding 16 fixed, roadmap step 4 done, step 12 note), and the CLAUDE.md commands list gains the regenerate command.

## Non-goals

- No runtime validation of DB rows (owner agreed with this guess: no current benefit, adds cost). Request validation (`src/formSchemas/`, the zod schema on `POST /api/bracket/simulation`) is unchanged.
- No `strict` / `strictNullChecks` changes; that is step 12. Accurate nullability is recorded now so step 12 has real types to work against.
- No changes to the retired Edge Functions under `supabase/functions/` (pending deletion).
- No types for non-`public` schemas (`stats` is private and not reachable from the app).
- No other `CLAUDE.md` sections move in this step; the rest of the restructure happens as later roadmap steps touch their areas.

## Anti-goals (a failure even if it compiles)

- Any change in gameplay, API responses, or dashboard output. This is types-only plus fixing names nothing reads.
- A guard that is flaky or fails for reasons unrelated to schema drift (e.g. line endings, CLI version differences, formatting tools rewriting the generated file).
- Hand edits to `types/database.ts`; it is only ever regenerated.

## Constraints

- Follow TDD where it applies: the CI guard is proven by showing it fails on a deliberately stale `types/database.ts` before calling it done (temporary commit or local run of the same script); existing vitest suites must stay green and are the characterization net for the repository changes.
- `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, and `npx supabase test db` all pass at the end.
- The generated file must be excluded from anything that would reformat it (ESLint `--fix`, Prettier if present, editor format-on-save is out of scope) and committed with LF line endings (`.gitattributes` entry), since the repo has `core.autocrlf=true` locally and CI runs on Linux.
- No hosted-database access is needed; generation uses the local DB only.

## Left to the builder

- Whether the regenerate step is an npm script (e.g. `npm run db:types`) used by both developers and CI (suggested, so both run the identical command), and its exact name.
- Exact helper types used (`Tables`, `TablesInsert`, function return helpers from the generated file vs local helpers).
- How each remaining cast is handled; whether an RPC model needs a narrower type than the generated one (e.g. a column the RPC never returns null for), as long as it is derived from the generated type.
- Whether the two client hooks need any change beyond picking up the typed browser client.
- Wording and structure of `.claude/rules/database.md` and the rule-index table, within the goals above.
