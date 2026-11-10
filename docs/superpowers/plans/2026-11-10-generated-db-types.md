# Generated Database Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate `types/database.ts` from the local Supabase schema, type every Supabase client and repository with it, derive the `models/appStatsData` types from it, and fail CI when a migration lands without regenerated types.

**Architecture:** A small Node script wraps `supabase gen types` (write mode for developers, `--check` mode for CI) so both run the identical command and a failed generation never truncates the committed file. Models become aliases of the generated `Tables<>` / `TablesInsert<>` / RPC `Returns` types, pinned by type-level vitest tests that `tsc` checks. The database section of `CLAUDE.md` moves to a path-scoped `.claude/rules/database.md`.

**Tech Stack:** TypeScript (strict: false), Next.js 14, `@supabase/supabase-js` ^2.58, `@supabase/ssr` ^0.7, Supabase CLI 3.0.0 (lockfile), vitest (`expectTypeOf`), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-10-generated-db-types-design.md`

## Global Constraints

- Generation command, exactly: `npx supabase gen types typescript --local --schema public`. Output file: `types/database.ts`. Never hand-edited.
- `types/database.ts` is committed with LF endings: `.gitattributes` line `types/database.ts text eol=lf`.
- No runtime behavior change: gameplay, API responses and dashboard output are identical. No zod `.parse` of DB rows. Request validation (`src/formSchemas/`, bracket POST schema) untouched.
- `tsconfig.json` stays `strict: false`. `supabase/functions/` untouched. Only the `public` schema is generated.
- Exported model names in `models/appStatsData` keep their names and become **Row** types; insert shapes get new `…InsertSupabase` names.
- Import the generated types as `@/types/database` (not the bare `*` -> `types/*` path mapping).
- Doc changes ship in this PR (no docs-only PRs). `.claude/` is protected from subagents: Task 4's rule-file edits are done by the interactive session.
- Done = `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npx supabase test db`, `npm run db:types:check` all pass.

## Review Focus

1. `npm run db:types` with the local DB stopped -> must exit non-zero and leave `types/database.ts` untouched (a `>` redirect would truncate it). Pinned in Task 1 Step 5.
2. A Windows checkout (`core.autocrlf=true`) followed by `npm run db:types:check` -> must pass (no CRLF false positive). Pinned in Task 1 Step 6 via `git ls-files --eol`.
3. A migration that adds a column without regenerating -> CI `db-tests` job fails with a message naming the fix. Pinned in Task 1 Steps 3-4.
4. Partial selects (e.g. `TournamentRepository.getYears` selects `"id, year"`) -> must still compile and return the same data; a narrowed return type or a commented cast, never a silent behavior change. Pinned in Task 3 Step 3.
5. Bracket persistence (`mapTournamentToRows` -> `persistBracket` -> `persistTournament`, picks get `game_id` after their game insert) -> rows written are identical. Pinned by the existing `tests/unit/mappers/mapTournamentToRows.test.ts` and `tests/integration/bracketSimulation.test.ts` staying green in Task 2.

---

### Task 1: Generated types file, generate/check script, CI drift guard

**Files:**
- Create: `scripts/db/generate-types.mjs`
- Create: `types/database.ts` (generated)
- Create: `.gitattributes`
- Modify: `package.json` (scripts)
- Modify: `.github/workflows/ci.yml` (db-tests job, after "Run pgTAP tests")

**Interfaces:**
- Produces: `types/database.ts` exporting `Database`, `Json`, `Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>`, `Enums`, `CompositeTypes`, `Constants` (CLI output). npm scripts `db:types` and `db:types:check`.

- [ ] **Step 1: Implement `scripts/db/generate-types.mjs`**
  - Runs the generation command with `child_process.execSync` (works on Windows and Linux), capturing stdout; on non-zero exit or empty output prints the CLI error plus "Is the local database running? Start it with `npx supabase db start`." and exits 1 **without writing anything**.
  - Default mode: writes stdout to `types/database.ts` (UTF-8, as-is).
  - `--check` mode: compares stdout with the current `types/database.ts` after normalizing `\r\n` to `\n` on both sides; on mismatch prints `::error file=types/database.ts::types/database.ts is out of date with supabase/migrations. Run \`npm run db:types\` with the local database running (npx supabase db start) and commit the result.` and exits 1; on match prints `types/database.ts is up to date` and exits 0.
- [ ] **Step 2: Add npm scripts and generate the file**
  - `package.json` scripts: `"db:types": "node scripts/db/generate-types.mjs"`, `"db:types:check": "node scripts/db/generate-types.mjs --check"`.
  - `.gitattributes`: `types/database.ts text eol=lf`.
  - Run: `npx supabase db start` then `npm run db:types`. Expected: `types/database.ts` exists (~595 lines) and contains `"user_total_stats"` and `"get_top_picked_teams_for_user_and_year"`.
- [ ] **Step 3: Prove the guard fails on a stale file (RED)**
  - Temporarily delete the line containing `"is_power_conference"` from `types/database.ts`.
  - Run: `npm run db:types:check`. Expected: exit code 1 and the `::error` message from Step 1.
  - Run `npm run db:types` to restore; `npm run db:types:check` -> exit 0.
- [ ] **Step 4: Add the CI step**
  - In `.github/workflows/ci.yml`, db-tests job, after "Run pgTAP tests": a step named `Check generated database types are current` running `npm run db:types:check`.
- [ ] **Step 5: Prove a failed generation leaves the file intact**
  - Run `npx supabase stop`, then `npm run db:types`. Expected: exit 1, the "Is the local database running?" message, and `git status --short types/database.ts` shows no change. Restart with `npx supabase db start`.
- [ ] **Step 6: Check line endings**
  - Run: `git add types/database.ts .gitattributes && git ls-files --eol types/database.ts`. Expected: `i/lf` and `attr/text eol=lf`.
- [ ] **Step 7: Commit**

```bash
git add scripts/db/generate-types.mjs types/database.ts .gitattributes package.json .github/workflows/ci.yml
git commit -m "feat(db): generate Supabase types and fail CI when they drift"
```

### Task 2: Models derived from the generated types

**Files:**
- Create: `tests/unit/models/databaseTypes.test.ts`
- Create: `models/appStatsData/rpc.ts`
- Modify: every file in `models/appStatsData/` (14 models), `models/appStatsData/index.ts`
- Modify: `application/mappers/mapTournamentToRows.ts`, `infrastructure/db/TournamentRepository.ts` (`PersistTournamentData`, `persistBracket` param type only), `tests/factories/userTotalStats.factory.ts`, other factories/tests only where `tsc` requires it

**Interfaces:**
- Consumes: `Database`, `Tables`, `TablesInsert` from `@/types/database` (Task 1).
- Produces:
  - `RpcRow<F extends keyof Database["public"]["Functions"]>` in `models/appStatsData/rpc.ts`: the element type of that function's `Returns` array.
  - Row aliases: `BracketSupabase = Tables<"user_brackets">`, `BracketScoringRuleSupabase = Tables<"tournament_scoring_rules">`, `ConferenceSupabase = Tables<"conferences">`, `PickSupabase = Tables<"user_picks">`, `ProfileSupabase = Tables<"profiles">`, `RoundSupabase = Tables<"rounds">`, `TeamSupabase = Tables<"teams">`, `GameSupabase = Tables<"tournament_games">`, `UserTotalStatsSupabase = Tables<"user_total_stats">`, `YearSupabase = Tables<"years">`.
  - Insert types: `BracketInsertSupabase = TablesInsert<"user_brackets">`, `GameInsertSupabase = TablesInsert<"tournament_games">`, `PickInsertSupabase = Omit<TablesInsert<"user_picks">, "game_id">` (the mapper builds picks before their game exists; `persistTournament` adds `game_id`).
  - RPC models (`TeamPerformanceSupabase`, `ConferencePerformanceSupabase`, `SeedPerformanceSupabase`, `TeamPickCountSupabase`) built from `RpcRow<...>` of the functions whose results the repositories return as that model; the shape may stay "shared base + optional metric columns" as long as every column type comes from the generated types.
  - Each file keeps only `export type`; zod imports and `…SupabaseSchema` exports are removed.

- [ ] **Step 1: Write the failing type test** `tests/unit/models/databaseTypes.test.ts`

```ts
import { describe, it, expectTypeOf } from "vitest";
import type { Tables, TablesInsert } from "@/types/database";
import type { RpcRow } from "@/models/appStatsData/rpc";
import type * as M from "@/models/appStatsData";

describe("models match the generated database types", () => {
  it("table models are the generated Row types", () => {
    expectTypeOf<M.UserTotalStatsSupabase>().toEqualTypeOf<Tables<"user_total_stats">>();
    expectTypeOf<M.ConferenceSupabase>().toEqualTypeOf<Tables<"conferences">>();
    expectTypeOf<M.GameSupabase>().toEqualTypeOf<Tables<"tournament_games">>();
    expectTypeOf<M.PickSupabase>().toEqualTypeOf<Tables<"user_picks">>();
    expectTypeOf<M.BracketSupabase>().toEqualTypeOf<Tables<"user_brackets">>();
    // ...one line per remaining table model listed in Interfaces
  });
  it("insert models are the generated Insert types", () => {
    expectTypeOf<M.BracketInsertSupabase>().toEqualTypeOf<TablesInsert<"user_brackets">>();
    expectTypeOf<M.GameInsertSupabase>().toEqualTypeOf<TablesInsert<"tournament_games">>();
    expectTypeOf<M.PickInsertSupabase>().toEqualTypeOf<Omit<TablesInsert<"user_picks">, "game_id">>();
  });
  it("every RPC row fits the model its repository returns", () => {
    expectTypeOf<RpcRow<"get_top_performing_teams_by_year">>().toMatchTypeOf<M.TeamPerformanceSupabase>();
    // ...one line per rpc() call in infrastructure/db/*Repository.ts, paired with that method's Promise<...> model
  });
});
```

- [ ] **Step 2: Run to verify it fails**
  Run: `npx tsc --noEmit`. Expected: errors in `tests/unit/models/databaseTypes.test.ts` (missing `rpc.ts`, missing insert types, `UserTotalStatsSupabase` not equal: `rounds_two_guessed_correctly` vs `round_twos_guessed_correctly`). (`npx vitest run` passes it regardless; `tsc` is the check.)
- [ ] **Step 3: Implement the models and `rpc.ts`** per the Interfaces block; export the new names from `models/appStatsData/index.ts`.
- [ ] **Step 4: Move insert sites to the insert types**
  - `mapTournamentToRows.ts`: `MappedRowsResult = { game: GameInsertSupabase; pick: PickInsertSupabase | undefined }[]`; `gameRow: GameInsertSupabase`, `pickRow: PickInsertSupabase`.
  - `TournamentRepository.ts`: `PersistTournamentData.bracket: BracketInsertSupabase`; `persistBracket(bracket: BracketInsertSupabase)`.
  - `tests/factories/userTotalStats.factory.ts`: rename to `round_twos_guessed_correctly` / `rounds_ones_guessed_correctly`, keep the values.
  - Fix any other factory/test that `tsc` flags, without changing asserted values.
- [ ] **Step 5: Verify green**
  Run: `npx tsc --noEmit` (expect only the 2 known CSS-module errors if `next-env.d.ts` is absent, otherwise 0) and `npx vitest run` (expect all pass, same count as before plus the new file).
- [ ] **Step 6: Commit**

```bash
git add models tests application/mappers/mapTournamentToRows.ts infrastructure/db/TournamentRepository.ts
git commit -m "refactor(models): derive Supabase row types from generated database types"
```

### Task 3: Typed Supabase clients and repositories

**Files:**
- Modify: `infrastructure/db/supabaseClient.ts`, `supabaseServer.ts`, `supabaseServiceRole.ts`, all 7 `infrastructure/db/*Repository.ts`
- Modify (only if `tsc` requires): `src/hooks/useFieldAvailability.ts`, `src/hooks/useSignUp.ts`
- Test: `tests/unit/models/databaseTypes.test.ts` (add one `it`)

**Interfaces:**
- Consumes: `Database` (Task 1), model types (Task 2).
- Produces: `createBrowserClient<Database>`, `createServerClient<Database>`, `createClient<Database>` return values; repository fields typed `SupabaseClient<Database>`.

- [ ] **Step 1: Add the failing test** (new `it` in `databaseTypes.test.ts`)

```ts
it("Supabase clients are typed with Database", () => {
  expectTypeOf<ReturnType<typeof createSupabaseServiceRoleClient>>().toEqualTypeOf<SupabaseClient<Database>>();
  expectTypeOf(supabase).toEqualTypeOf<SupabaseClient<Database>>();
});
```
  (`supabase` from `@/infrastructure/db/supabaseClient`; stub env vars already come from `src/test-setup.ts`.) Run `npx tsc --noEmit`; expected: errors on these two lines.
- [ ] **Step 2: Type the three clients and the repository fields** with `<Database>`.
- [ ] **Step 3: Remove casts the typed client makes redundant**
  - Delete each `as XSupabase` / `as XSupabase[]` where `tsc` accepts the plain value.
  - For partial selects (e.g. `getYears` selecting `"id, year"`), either narrow the method's return type (e.g. `Pick<YearSupabase, "id" | "year">[]`) when no caller needs more, or keep the cast with a one-line `// cast: <reason>` comment. Never change the selected columns.
  - RPC calls: `rpc("<name>", { p_year_id })` args are now checked; fix any arg-name mismatch `tsc` reports (none expected).
- [ ] **Step 4: Verify green**
  Run: `npx tsc --noEmit`, `npx vitest run`, `npm run lint`. Expected: all pass; record the remaining cast count (`grep -c " as [A-Za-z]*Supabase" infrastructure/db/*.ts`) for the PR description.
- [ ] **Step 5: Commit**

```bash
git add infrastructure src/hooks tests/unit/models/databaseTypes.test.ts
git commit -m "refactor(db): type Supabase clients and repositories with generated Database types"
```

### Task 4: Database rule file, CLAUDE.md rule index, docs (interactive session only)

**Files:**
- Create: `.claude/rules/database.md`
- Modify: `CLAUDE.md`, `docs/DIAGNOSIS.md`
- (The plan file itself was committed before execution.)

- [ ] **Step 1: Create `.claude/rules/database.md`**
  - Frontmatter: `paths:` with `"supabase/**"`, `"infrastructure/db/**"`, `"models/**"`, `"types/database.ts"`, `"scripts/db/**"`.
  - Body: the current `CLAUDE.md` "Database (Supabase / Postgres)" section moved verbatim (baseline mirror rule, tables, RPCs, service-role note, migrations auto-apply, CI token note, DB tests, column grants, stats schema notes, never write to hosted, schema dump command), plus a new "Generated types" section: after any migration run `npx supabase db start` (or `db reset`) then `npm run db:types` and commit `types/database.ts`; never edit it by hand; CI `db:types:check` fails otherwise; models in `models/appStatsData` are aliases (`Tables<>` Row names, `…InsertSupabase` for inserts, `RpcRow<>` for RPCs), and a new table/RPC gets an alias there plus a line in `tests/unit/models/databaseTypes.test.ts`.
- [ ] **Step 2: Slim `CLAUDE.md`**
  - Replace the Database section with 2-3 lines: the never-break invariants as bullets with `→ .claude/rules/database.md` (never write to the hosted project without confirmation; migrations auto-apply on merge; regenerate types after every migration).
  - Add a `## Rule index` section with the sentence "Rules load automatically when you touch matching files. Before designing or planning a change, read the rule files for every topic it touches." and a table `| Topic | Rule file | Loads when you touch |` with the database row.
  - Commands block: add `npm run db:types         # regenerate types/database.ts (local DB must be running)`.
- [ ] **Step 3: Update `docs/DIAGNOSIS.md`**
  - Finding 16: append "**Fixed in step 4**" with one line on what shipped (generated types, typed clients, CI drift guard).
  - Roadmap row 4: mark done. Row 12: add "Generated types already record nullability; turning on `strictNullChecks` will surface the ~40 nullable columns."
- [ ] **Step 4: Verify**
  Run: `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npx supabase test db`, `npm run db:types:check`. Expected: all pass.
- [ ] **Step 5: Commit**

```bash
git add .claude/rules/database.md CLAUDE.md docs/DIAGNOSIS.md
git commit -m "docs: database rule file, CLAUDE.md rule index, step 4 status"
```
