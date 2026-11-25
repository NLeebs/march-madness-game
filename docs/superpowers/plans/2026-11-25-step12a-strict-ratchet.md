# Step 12a - Strict Ratchet + Logic Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A CI ratchet that fails when a strict-clean path picks up a `strict` error; `src/functions`, `store` and `src/hooks` made strict-clean and listed; finding 61 fixed.

**Architecture:** A pure, unit-tested `evaluateRatchet` decides violations from compiler diagnostics and a committed path list; a thin `tsx` runner builds the program from `tsconfig.strict.json` with the TypeScript compiler API and feeds it. The logic-layer fixes prefer correcting types at their source over guards; guards that are needed throw `GameDataError` and get a unit test.

**Tech Stack:** TypeScript 5.7 compiler API, `tsx`, vitest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-25-step12-incremental-strict-design.md`

## Global Constraints

- No gameplay change: `tests/game/` (fixed-contract, statistical, draw-order pins), `tests/unit/components/Tournament/bracketRender.test.tsx` and e2e pass with the same assertions, expected values and pins. Never run `vitest -u`.
- No `any`, `as any`, `@ts-ignore`, `@ts-expect-error`. In production code, a non-null `!` only when an invariant guarantees the value, with a one-line comment saying which.
- `as` casts only for `Object.keys(x) as (keyof T)[]` (or the `Object.entries` equivalent) on objects whose keys are exactly `keyof T`; none to silence a mismatch.
- Fix preference order: (1) tighten the type at its source after checking every producer, (2) narrow at the use site keeping the old path, (3) typed accessor throwing `GameDataError` (`@/src/functions/generic`) with a unit test.
- `npx tsc --noEmit` (non-strict) stays at zero errors after every task; CI also runs `npm run typecheck:db-types`.
- Branch `refactor/step12a-strict-ratchet` off `main`; conventional commit prefixes; every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run `npm ci` before any `npx tsc` / `npx vitest` if `node_modules` is missing.

## Review Focus

- **A listed path that matches nothing** (typo, rename, Windows `\` paths from the runner) must fail, not pass vacuously. Test: `reports a listed path with no program files as unmatched` (Task 1).
- **`app/` must not cover `application/`** (and `middleware.ts` must not cover `middleware.tsx`). Test: `does not let a folder prefix match a sibling with the same leading letters` (Task 1).
- **A diagnostic with no file** (bad tsconfig, global error) must fail the ratchet. Test: `treats a diagnostic with no file as a violation` (Task 1).
- **Generated `.next/` files and `node_modules`** must not appear as program files or "newly clean" suggestions. Runner filter in Task 1; checked by running it locally after `npm run build`.
- **Missing round-one data in a play-in result** used to crash with a bare `TypeError`; it must now throw `GameDataError` with `region`/`seedType` details. Tests in Task 2.

---

### Task 1: Ratchet module, runner, CI step

**Files:**
- Create: `scripts/typecheck/ratchet.ts` (pure), `scripts/typecheck/strictRatchet.ts` (runner), `scripts/typecheck/strictPaths.json`, `tsconfig.strict.json`
- Test: `tests/unit/scripts/strictRatchet.test.ts`
- Modify: `package.json` (script), `.github/workflows/ci.yml`, `CLAUDE.md`
- Also commit: `docs/superpowers/specs/2026-11-25-step12-incremental-strict-design.md` (currently untracked on `main`) and this plan.

**Interfaces:**
- Produces:
  ```ts
  // scripts/typecheck/ratchet.ts
  export type StrictDiagnostic = {
    file: string | null; // repo-relative, forward slashes; null = no file
    line: number;        // 1-based
    column: number;      // 1-based
    code: number;        // TS error code
    message: string;     // flattened message text
  };
  export type RatchetResult = {
    violations: StrictDiagnostic[]; // in listed paths, or file === null
    unmatchedPaths: string[];       // listed paths that match no program file
    newlyClean: string[];           // advisory only
  };
  export function evaluateRatchet(input: {
    diagnostics: readonly StrictDiagnostic[];
    programFiles: readonly string[]; // repo-relative, forward slashes
    strictPaths: readonly string[];
  }): RatchetResult;
  export function formatDiagnostic(d: StrictDiagnostic): string; // "file(line,col): error TScode: message", "<no file>" when null
  ```
  - Matching: an entry ending in `/` covers files that start with it; any other entry covers only the identical path.
  - `newlyClean` candidates: each top-level folder of `programFiles` (as `"<name>/"`), each root-level file, and each immediate sub-folder of `src/` (as `"src/<name>/"`). A candidate is reported when it has at least one program file, no diagnostics in it, and no `strictPaths` entry covers it (an entry covers a candidate when the entry equals it or is a prefix of it). Sorted.
- `npm run typecheck:strict` → `tsx scripts/typecheck/strictRatchet.ts`.

- [ ] **Step 1: Create the branch and commit the spec and plan**

```bash
git checkout -b refactor/step12a-strict-ratchet
git add docs/superpowers/specs/2026-11-25-step12-incremental-strict-design.md docs/superpowers/plans/2026-11-25-step12a-strict-ratchet.md
git commit -m "docs: step 12 strict spec and 12a plan"
```

- [ ] **Step 2: Write the failing tests** in `tests/unit/scripts/strictRatchet.test.ts`, importing from `@/scripts/typecheck/ratchet`. A local helper `diag(file, code = 2322)` builds a `StrictDiagnostic` at line 1, column 1. Cases:
  - `reports an error in a listed folder` - paths `["application/"]`, file `application/a.ts` with one diagnostic → `violations` has it.
  - `ignores an error in an unlisted folder` - paths `["application/"]`, diagnostic in `src/components/X.tsx` → `violations` empty.
  - `does not let a folder prefix match a sibling with the same leading letters` - paths `["app/"]`, diagnostic in `application/a.ts` (both files in `programFiles`) → `violations` empty.
  - `matches a file entry exactly` - paths `["middleware.ts"]`, diagnostics in `middleware.ts` and `middleware.tsx` → only the `middleware.ts` one is a violation.
  - `treats a diagnostic with no file as a violation` - `file: null`, any paths → one violation.
  - `reports a listed path with no program files as unmatched` - paths `["application/", "aplication/", "gone.ts"]`, `programFiles: ["application/a.ts"]` → `unmatchedPaths` equals `["aplication/", "gone.ts"]`.
  - `suggests unlisted clean top-level folders, root files and src sub-folders` - `programFiles: ["app/p.tsx", "store/s.ts", "src/hooks/h.ts", "src/components/c.tsx", "middleware.ts"]`, diagnostic only in `src/components/c.tsx`, paths `["app/"]` → `newlyClean` equals `["middleware.ts", "src/hooks/", "store/"]` (not `app/`: listed; not `src/`: dirty; not `src/components/`: dirty).
  - `does not suggest a candidate already covered by a broader entry` - paths `["src/"]`, `programFiles: ["src/hooks/h.ts"]`, no diagnostics → `newlyClean` empty.
  - `formats a diagnostic like tsc` - `formatDiagnostic({file:"a.ts",line:3,column:7,code:2322,message:"m"})` equals `"a.ts(3,7): error TS2322: m"`; with `file: null` it starts with `"<no file>: error TS"`.

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run tests/unit/scripts/strictRatchet.test.ts`
Expected: FAIL, cannot resolve `@/scripts/typecheck/ratchet`.

- [ ] **Step 4: Implement `evaluateRatchet` and `formatDiagnostic`** in `scripts/typecheck/ratchet.ts` (no imports from `typescript`, so it stays pure).

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/unit/scripts/strictRatchet.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Add `tsconfig.strict.json`, the runner and the path list**
  - `tsconfig.strict.json`: `{ "extends": "./tsconfig.json", "compilerOptions": { "strict": true, "incremental": false } }`.
  - `scripts/typecheck/strictRatchet.ts`: read the config with `ts.readConfigFile` + `ts.parseJsonConfigFileContent` (base dir = repo root, `process.cwd()`), `ts.createProgram`, `ts.getPreEmitDiagnostics`. Convert each to `StrictDiagnostic` (`ts.flattenDiagnosticMessageText(..., "\n")`, 1-based line/column via `getLineAndCharacterOfPosition`). File paths: `path.relative(root, fileName).split(path.sep).join("/")`. `programFiles` = the program's source files under the root, excluding anything under `node_modules/` or `.next/`, or outside the root. Keep only diagnostics whose file is null or in `programFiles`. Print each violation with `formatDiagnostic`, each unmatched path as `strict path matches no files: <path>`, and the `newlyClean` list under a heading `Strict-clean but not listed (add to scripts/typecheck/strictPaths.json):`. Exit 1 if `violations` or `unmatchedPaths` is non-empty; else print `Strict ratchet: N paths clean.` and exit 0.
  - `package.json`: `"typecheck:strict": "tsx scripts/typecheck/strictRatchet.ts"`.
  - `scripts/typecheck/strictPaths.json`: run `npm run typecheck:strict` with `[]` first. Then list exactly the `newlyClean` entries it prints, which should be about `app/`, `application/`, `infrastructure/`, `models/`, `scripts/`, `types/`, `utils/`, the root config/instrumentation/middleware files and clean `src/` sub-folders other than `src/functions/` and `src/hooks/`. Leave out `src/functions/`, `src/hooks/` and `store/` if they show up (they have errors today, so they shouldn't). Leave out `tests/` and `e2e/` even if a sub-part shows up.

- [ ] **Step 7: Verify the runner both ways**

Run: `npm run typecheck:strict` → exit 0, `Strict ratchet: N paths clean.`
Then temporarily add `const x: string = null;` to `utils/api/allowedOrigins.ts` and run it → exit 1 with `utils/api/allowedOrigins.ts(...): error TS2322`. Revert. Temporarily add `"nope/"` to the list → exit 1 with `strict path matches no files: nope/`. Revert.

- [ ] **Step 8: CI and CLAUDE.md**
  - `.github/workflows/ci.yml`, in the job that runs `npx tsc --noEmit`, right after the DB-drift step: a step named `Type-check strict paths (ratchet)` running `npm run typecheck:strict`.
  - `CLAUDE.md` Commands: add `npm run typecheck:strict   # strict ratchet: listed paths must be strict-clean (runs in CI)`. Conventions: replace the `strict: false today` bullet with: "TypeScript, `strict: false` in `tsconfig.json` while step 12 is in progress. Paths in `scripts/typecheck/strictPaths.json` must stay strict-clean (`npm run typecheck:strict`, CI). Don't add new `any`; type new code as if strict were on. When the ratchet prints a newly clean path, add it to the list."

- [ ] **Step 9: Commit**

```bash
git add scripts/typecheck tsconfig.strict.json tests/unit/scripts package.json .github/workflows/ci.yml CLAUDE.md
git commit -m "build: strict ratchet over strict-clean paths in CI"
```

---

### Task 2: Tournament types and `src/functions` strict-clean

**Files:**
- Modify: `types/tournament/TournamentTeam.ts`, `types/tournament/TournamentGameResult.ts`, `types/tournament/TournamentMatchup.ts`, `types/tournament/TournamentPicks.ts`, `types/tournament/index.ts` (if a new type is added), `application/mappers/mapBracketToPayload.ts`, `src/functions/seeding/createMatchupsFromSeededArr.ts`, `src/functions/tournament/{buildRoundOneMatchups,applyGameResult,emptyState,picks,seedTournament,simulateTournament,scoreRound}.ts`, `src/components/Tournament/TournamentRound.tsx` (only as needed to keep non-strict `tsc` green)
- Delete: `src/functions/teamStatsData/totalNumberOfNCAATeams.ts` and its barrel line (no callers; its parameter type is wrong)
- Test: `tests/unit/functions/tournament/applyGameResult.test.ts`
- Modify: `scripts/typecheck/strictPaths.json` (add `src/functions/`)

**Interfaces:**
- Consumes: `npm run typecheck:strict` (Task 1).
- Produces (types other tasks and 12b rely on):
  - `TournamentTeam.seed: string | number` and `TournamentGameResult.seed?: string | number`. Bracket seeds are numbers at runtime (`createMatchupsFromSeededArr`), while fixtures and picks use strings. Narrowing to one type is left for later and logged as a new DIAGNOSIS finding in Task 4.
  - `TournamentRoundMatchups = { [region in Exclude<TournamentRegion, "playin">]?: TournamentMatchup[] } & { playin?: PlayinMatchup }`. Today `"playin"` is also a region key, so `playin` is typed `TournamentMatchup[] & PlayinMatchup`.
  - `RoundOneMatchups = Record<SeedRegion, TournamentMatchup[]> & { playin: PlayinMatchup }`, exported from `types/tournament`, returned by `buildRoundOneMatchups` (drop its `as TournamentRoundMatchups` cast).
  - `Pick.region: TournamentRegion` (was `string`).
  - `scoreRound`'s `correct: Partial<Record<Exclude<TournamentRegion, "playin">, boolean[][]>>` (was `Record<string, ...>`).

- [ ] **Step 1: Write the failing tests** in `tests/unit/functions/tournament/applyGameResult.test.ts`, in the `applyPlayinResult` describe:
  - `throws GameDataError when round one lacks the play-in slot's region` - a round one with no `west` (or whichever region `PLAYIN_ROUND_ONE_SLOTS.elevenSeeds[0].region` is, read from the constant), result `{ seedType: "elevenSeeds", gameIndex: 0, winningTeam: "A" }` → `toThrow(GameDataError)`, and the error's `details` include `{ region, seedType: "elevenSeeds" }`.
  - `throws GameDataError when round one has no play-in games` - every region present, `playin` absent → `toThrow(GameDataError)` with `details.seedType`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/unit/functions/tournament/applyGameResult.test.ts`
Expected: the 2 new tests FAIL (a `TypeError` is thrown, not `GameDataError`); the rest pass.

- [ ] **Step 3: Apply the type changes and fixes**
  - The type changes listed under Interfaces.
  - `mapBracketToPayload.ts`: `parseInt(String(x.seed))` at the four seed sites (same result for both string and number seeds).
  - `createMatchupsFromSeededArr`: type the array it builds as `TournamentMatchup[]` up front; the number seeds now fit `TournamentTeam`.
  - `applyPlayinResult`: read `roundOne[slot.region]` and `roundOne.playin` into locals; throw `new GameDataError("applyPlayinResult: ...", { region: slot.region, seedType, gameIndex })` when missing, matching the style of `applyGameResult`'s existing throw. Its `RoundGames` alias excludes `"playin"`.
  - `simulateTournament`: build `const roundOne = buildRoundOneMatchups(...)` and iterate `roundOne.playin` (same data and order as reading it back from `bracket`). Narrow `roundMatchups[region]` in the rounds loop the same way the `"playin"` key is skipped. The `result.seed` assignment type-checks after the seed widening.
  - `seedTournament`: make `line` a complete `Record<SeedRegion, string>` without a cast. The `next++` reads must still happen in snake order (`regions` order).
  - `picks.ts`: compiles once `Pick.region` is `TournamentRegion`. Fix any producer that now fails non-strict `tsc`.
  - `emptyState.ts`: drop the `as TournamentRoundMatchups` cast if the new type makes it unnecessary (it does in a trial run).

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/unit/functions tests/game tests/unit/mappers tests/unit/components/Tournament` → all PASS, no snapshot written.
Run: `npx tsc --noEmit` → 0 errors.
Run: `npx tsc --noEmit --strict 2>&1 | grep -E "^(src/functions|types|application)/"` → no output.

- [ ] **Step 5: List `src/functions/`, run the ratchet, commit**

Add `"src/functions/"` to `strictPaths.json`; `npm run typecheck:strict` → exit 0.

```bash
git add -A types src/functions application/mappers src/components/Tournament tests/unit/functions scripts/typecheck/strictPaths.json
git commit -m "refactor(types): strict-clean tournament types and src/functions"
```

---

### Task 3: `store/` and `src/hooks/` strict-clean

**Files:**
- Modify: `store/appStateSlice.ts`, `store/tournamentSlice.ts`, `src/hooks/useSignUp.ts`, `scripts/typecheck/strictPaths.json`

**Interfaces:**
- Consumes: `scoreRound`'s narrowed `correct` type and `TournamentRoundMatchups` from Task 2.
- Produces: `TournamentState.tournamentSeeds: Record<SeedRegion, string[]>` (initial state already has all four).

- [ ] **Step 1: Fix**
  - `appStateSlice.ts` (lines ~48, ~71): `(Object.keys(state) as (keyof AppState)[])`.
  - `tournamentSlice.ts`: `tournamentSeeds` type as above (drop the `as Record<SeedRegion, string[]>` cast near line 97). In `recordRoundScore`, iterate the keys of `correct` typed via `Object.keys(correct) as (keyof typeof correct)[]` and read `next[region]`. If that value is missing where `correct` has the region, throw `GameDataError` with `{ round, region }` (the old code threw a `TypeError` there).
  - `useSignUp.ts`: delete the two unreachable `return` lines after `throw`.

- [ ] **Step 2: Add the throw's test** in `tests/game/tournamentSlice.test.ts`'s `recordRoundScore` block, or the closest unit file for the slice: `throws GameDataError when the next round lacks a region that scoreRound scored`. Run it, see it pass. Then temporarily revert the guard and see it fail with a `TypeError`, then restore it.

- [ ] **Step 3: Verify**

Run: `npx vitest run tests/game tests/unit/store tests/unit/hooks` → PASS.
Run: `npx tsc --noEmit` → 0 errors.

- [ ] **Step 4: List and commit**

Add `"store/"` and `"src/hooks/"` to `strictPaths.json`; `npm run typecheck:strict` → exit 0. Also add any other path it now prints as newly clean, except under `tests/` or `e2e/`.

```bash
git add store src/hooks tests/game/tournamentSlice.test.ts scripts/typecheck/strictPaths.json
git commit -m "refactor(store): strict-clean store and hooks"
```

---

### Task 4: Shared hook response types (finding 61)

**Files:**
- Modify: `application/useCases/tournament/GetScoringRulesId.ts`, `app/api/tournament-scoring-rules/[yearId]/route.ts`, `src/hooks/useTournamentScoringRules.ts`, `src/hooks/useMadnessPrep.ts`, `tests/unit/hooks/useMadnessPrep.test.tsx`

**Interfaces:**
- Produces: `export type TournamentScoringRulesResponse = { tournamentScoringRuleId: Awaited<ReturnType<typeof getScoringRuleIdByYearId>>; message: string }` in `GetScoringRulesId.ts`, re-exported through the `tournament` use-case barrel.

- [ ] **Step 1: Add type assertions that pin the contract** with vitest's `expectTypeOf`. In `tests/unit/hooks/useMadnessPrep.test.tsx`, for one team query and the seed query: `expectTypeOf(result.current.topPerformingTeams).toEqualTypeOf<ResultOf<typeof getTopPerformingTeamsByYear> | undefined>()` and the same for `firstRoundSeedMatchupUpsetPercentages` / `getFirstRoundSeedMatchupUpsetPercentageByYearId`. Use the property names the hook really returns. If the model types already match the use-case results these pass at once; that's fine, this is a type-only change and `tsc` is the gate.

- [ ] **Step 2: Implement**
  - Route: build the body as `{ tournamentScoringRuleId, message: "..." } satisfies TournamentScoringRulesResponse`.
  - Hook: `import type { TournamentScoringRulesResponse }` from the use-case barrel; delete the local type.
  - `useMadnessPrep`: each `usePrepQuery<...>` takes `ResultOf<typeof <useCase>>` for the use case its route returns, as follows. Top performers → `getTopPerformingTeamsByYear`. Non-power top performers → `getTopPerformingNonPowerConferenceTeamsByYear`. Most picked → `getTopPickedTeamsByYear`. Upsets caused → `getTeamsThatCausedMostUpsetsByYearId`. Upset prone → `getTeamsMostUpsetProneByYearId`. First-round seed upsets → `getFirstRoundSeedMatchupUpsetPercentageByYearId`. Championships → `getTeamsWithMostChampionshipsByYear`. Finals → `getTeamsInMostFinalsByYear`. Final fours → `getTeamsInMostFinalFoursByYear`. Elite eights → `getTeamsInMostEliteEightsByYear`. Sweet sixteens → `getTeamsInMostSweetSixteensByYear`. Second rounds → `getTeamsInMostSecondRoundsByYear`. Appearances → `getTeamsWithMostTournamentAppearancesByYear`. Use `import type`, and drop the `models/appStatsData` import.

- [ ] **Step 3: Verify**

Run: `npx vitest run tests/unit/hooks tests/integration/tournamentScoringRules.test.ts` → PASS.
Run: `npx tsc --noEmit` and `npm run typecheck:strict` → clean. Fix any component that consumed the old model types if non-strict `tsc` complains (type-only).

- [ ] **Step 4: Commit**

```bash
git add application/useCases/tournament app/api/tournament-scoring-rules src/hooks tests/unit/hooks
git commit -m "refactor(hooks): share scoring-rules and Madness Prep response types with the server"
```

---

### Task 5: Docs, full verification, PR

**Files:**
- Modify: `docs/DIAGNOSIS.md`, `.claude/rules/game-engine.md` (only if a function signature it names changed)

- [ ] **Step 1: DIAGNOSIS**
  - Finding 15: append "**Partly fixed in step 12a:** CI ratchet (`npm run typecheck:strict`, `scripts/typecheck/strictPaths.json`); `src/functions`, `store`, `src/hooks` and the already-clean layers are listed. Strict errors: 244 -> N." (N from `npx tsc --noEmit --strict | grep -c "error TS"`).
  - Finding 61: append "**Fixed in step 12a.**"
  - Add a new finding under "Found in step 12" with the next free number: bracket seeds are numbers at runtime (`createMatchupsFromSeededArr`) but were typed `string`, while picks and fixtures use strings. Now typed `string | number`; settle on one type later.
  - Roadmap row 12: "12a done (ratchet, logic layer, finding 61). 12b components, 12c tests + flip `strict: true`."

- [ ] **Step 2: Full verification** (superpowers:verification-before-completion)

Run each and read the output: `npm run lint`, `npx tsc --noEmit`, `npm run typecheck:db-types`, `npm run typecheck:strict`, `npx vitest run`, `npm run e2e`. All pass, and `git status` shows no new or changed snapshot files.

- [ ] **Step 3: Commit, push, open the PR**

```bash
git add docs/DIAGNOSIS.md .claude/rules
git commit -m "docs: step 12a in diagnosis"
git push -u origin refactor/step12a-strict-ratchet
gh pr create --title "refactor: step 12a - strict ratchet, logic layer, shared hook types" --body "<summary, test plan, the seed-type finding; ends with the Claude Code attribution line>"
```
