# Step 12 - Incremental `strict` with a CI ratchet

Roadmap step 12 in `docs/DIAGNOSIS.md` (findings 15 and 61).

## Intent

The repo compiles with `strict: false`. That hides real bugs, mostly values that can be `null`/`undefined` (the generated DB types record about 40 nullable columns), and lets loose types spread. The goal is `strict: true` everywhere, reached in small reviewable PRs. Between those PRs, CI must stop any folder that is already strict-clean from picking up new strict errors.

Also finding 61: two hooks still have hand-written response types (`useTournamentScoringRules`, `useMadnessPrep`). A renamed server field would still type-check and then fail at runtime.

## Current state (measured 2026-11-25, `npx tsc --noEmit --strict`)

- 244 errors (296 at the diagnosis).
- Already clean: `app/`, `application/`, `infrastructure/`, `utils/`, `models/`, `types/`, `scripts/`, `middleware.ts`, the root `instrumentation*.ts` files.
- Errors by area: `src/components` 107 (`Dashboard/UserStatsDashboard.tsx` 29, `UI/TeamBar.tsx` 18, `RegularSeason/__tests__/ConferenceGroups.test.tsx` 25), `tests/` 113, `src/functions` 11, `store` 8, `src/hooks` 2, `e2e` 3.
- By flag: `strictNullChecks` alone 228, `noImplicitAny` alone 37, `strictPropertyInitialization` 1, the other strict flags 0.
- CI (`.github/workflows/ci.yml`) runs `npx tsc --noEmit` (non-strict) and `npm run typecheck:db-types` (`tsconfig.db-types.json`: `strictNullChecks` on the model drift test only).

## Goals

- 12a/12b/12c below, each its own branch and PR. At the end, `tsconfig.json` has `strict: true` and the ratchet is deleted.
- A ratchet in CI from 12a on. It runs strict over the whole program and fails if any error is in a path listed as strict-clean.
- Finding 61 fixed in 12a.

## Non-goals

- No gameplay changes. Engine characterization tests (`tests/game/`, pins under `.claude/rules/game-engine.md`), the bracket render snapshot and e2e must keep passing with the same assertions, expected values and pins. No pin regeneration. Type-only edits to test files, `tests/game/` included, are allowed (see "Test code" below).
- No change to the bare-import path alias `"*": ["types/*"]` (finding 15 notes it; leave it).
- No dependency upgrades, no new lint rules.
- No work on the legacy folders listed in CLAUDE.md beyond what the compiler requires (they currently have 0 strict errors).

## Anti-goals (failure even if it compiles)

- Silencing errors in bulk with `any`, `as any`, `// @ts-ignore`/`@ts-expect-error`, or `!` scattered without a reason. In production code, a non-null assertion is allowed only when an invariant guarantees the value. In that case prefer a small typed accessor that throws `GameDataError` (game logic) or a plain `Error` (elsewhere). Only for data that is truly impossible to be missing, so behavior in valid states is identical.
- Changing runtime behavior to satisfy the compiler in a way that alters what a player sees, for example a new early return that skips a render the game used to do. When a guard is needed, it must take the path the old code effectively took (old code would have crashed or produced `undefined`), or throw where the old code would have thrown anyway.
- A ratchet that can be bypassed silently: a listed path that disappears or matches no files must fail the check, not pass vacuously.

## Approaches considered

1. **Ratchet first, then fix folder by folder (chosen).** A script plus CI step guards clean paths; fixes land in three PRs, and the last flips `strict: true`. Small PRs, guarded progress, at the cost of a temporary script.
2. **Fix everything with no ratchet, flip at the end.** Nothing temporary to build, but nothing guards clean folders between PRs.
3. **Per-folder tsconfig files (like `tsconfig.db-types.json`).** Doesn't work: tsc type-checks everything the included files import, so a strict config for `app/` reports errors from the components it imports. A filter over the errors is needed anyway.

The user picked 1.

## Design

### The ratchet (12a)

- `tsconfig.strict.json`: `extends: "./tsconfig.json"`, `compilerOptions: { strict: true, incremental: false }`. It covers the same files as the root config.
- `scripts/typecheck/strictPaths.json`: an array of repo-relative path prefixes that must be strict-clean, folders ending in `/` (`"application/"`) or single files (`"middleware.ts"`).
- `scripts/typecheck/strictRatchet.ts`, run with `tsx` (already a devDependency). Two parts:
  - A pure, unit-tested module (`scripts/typecheck/ratchet.ts`) that takes the diagnostics (file path + message) and the path list. It returns the errors in listed paths, the listed paths that match no file in the program (a failure), and the unlisted top-level folders/files that are now clean (an advisory, printed but not a failure, so a fixer remembers to list them).
  - A thin runner that gets the diagnostics from the TypeScript compiler API (`ts.getPreEmitDiagnostics` on the program built from `tsconfig.strict.json`) rather than parsing CLI text. It prints the offending errors in `file(line,col): message` form and exits 1 on any failure.
- `npm run typecheck:strict` runs it. A CI step "Type-check strict paths (ratchet)" runs it after the existing type-check, in the same job.
- Unit tests: `tests/unit/scripts/strictRatchet.test.ts` covers the pure module (TDD: written first).
- Docs: CLAUDE.md commands list gets `npm run typecheck:strict`; the "Conventions" bullet about `strict: false` says new and touched code in listed paths must be strict-clean and points to the list.

### Fix order of preference (all PRs)

1. **Tighten the type at its source** when every producer of the value always sets it: for example, make an optional field in `types/tournament` required, or narrow a `string` key to the real union. Check every place that builds the value (reducers, `emptyState`, factories, server mappers) before you do it. It's a type-only change with no runtime effect, and it often clears errors in later PRs as well. Allowed in any PR, including in `types/`, which is already on the clean list and must stay clean. *(Builder-check call: preferred over accessors.)*
2. **Narrow at the use site** (`if`, `in`, typed keys) when the value really can be missing, keeping the path the old code took.
3. **Typed accessor that throws `GameDataError`** only when the value is truly required at that point but optional in the type for a good reason (for example, a state shape that is empty before Selection Sunday). Give each such throw a unit test.

### Test code (12b, 12c)

*(Builder-check call.)* Test files, `tests/game/` and `e2e/` included, may get type-only edits: typed keys, factories in place of `{}` casts, narrowing helpers, and `!` on values the test has just produced or asserted. Assertions, expected values, seeds and draw-order pins do not change. If making a test compile seems to need a changed expectation, stop: that is a behavior question, not a type fix.

### 12a - ratchet + logic layer + finding 61

1. Ratchet as above, with the paths that are clean today.
2. Fix `src/functions/` (11), `store/` (8), `src/hooks/` (2) and add them to the list. Known cases:
   - `createMatchupsFromSeededArr.ts` declares `TournamentMatchup[]` but builds `{team, seed}[][]`: fix the declared type to what it returns (check callers).
   - String-indexed lookups (`picks.ts`, `appStateSlice.ts`, `tournamentSlice.ts`, `totalNumberOfNCAATeams.ts`): narrow the key type to the real key union (`keyof ...`, round/region unions from `types/tournament`) rather than casting the object.
   - Possibly-undefined playin/round data (`applyGameResult.ts`, `simulateTournament.ts`, `seedTournament.ts`, `tournamentSlice.ts`): a typed accessor that throws `GameDataError` when the data the code already relies on is missing.
   - `emptyState.ts` cast: build a value of the right type instead of a double cast.
   - `useSignUp.ts`: the 2 errors come from an unreachable `return` after a `throw`; remove it (no narrowing needed).
3. Finding 61:
   - Scoring rules: export a `TournamentScoringRulesResponse` type that sits next to the use case or in `types/` (builder's call), use it in the route with `satisfies`, and `import type` it in the hook. Removes the hook's hand-written type.
   - `useMadnessPrep`: type each query as `ResultOf<typeof <useCase>>` for the use case its route returns (or the route's wrapper type if the route wraps it), in place of the model types.
4. The engine pins and `tests/game` stay unchanged and green.

### 12b - components

Fix `src/components/**` (107, including `RegularSeason/__tests__/ConferenceGroups.test.tsx`, which lives under components) and add `src/` as a whole (or `src/components/`, `src/utils/` etc. individually) to the list. Typical fixes: `useState<T | undefined>` / guarded render, typed props, and fixtures built with `tests/factories/` in place of `{}` casts. Render snapshot and e2e unchanged.

### 12c - tests, e2e, flip

- Fix `tests/` (113) and `e2e/` (3). Prefer the existing factories over inline partial objects; add factory fields where needed.
- Set `"strict": true` in `tsconfig.json`. Delete `tsconfig.strict.json`, `scripts/typecheck/`, the ratchet tests, the `typecheck:strict` npm script and CI step. Also delete `tsconfig.db-types.json`, `npm run typecheck:db-types` and its CI step, because the root check now includes `strictNullChecks`.
- Update CLAUDE.md (commands, Conventions bullet: "strict is on"), `.claude/rules/database.md` (the `typecheck:db-types` note) and `docs/DIAGNOSIS.md` (finding 15 fixed, roadmap row 12 done).

### Each PR

- TDD where it applies: the ratchet module test first. For a fix that adds a guard with new runtime behavior (a throw), add a unit test for the throw.
- Verification before each PR: `npx tsc --noEmit`, `npm run typecheck:strict` (12a, 12b), `npm run lint`, `npx vitest run`, `npm run e2e`.
- DIAGNOSIS roadmap row 12 updated in each PR with what is done (no docs-only PRs).

## Left to the builder

- Exact location of the shared scoring-rules response type.
- Whether `src/` is listed as one prefix at the end of 12b or as sub-folders.
- The accessor helpers' names and where they live (`src/functions/tournament/` is the natural place for tournament-data ones).
