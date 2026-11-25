# Step 11 - `apiGet` / `useApiQuery` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the repeated `fetch -> !ok -> throw -> json()` block in the GET hooks with one `apiGet` helper and one `useApiQuery` hook, type every response, and load `GetYears`' two year lists in parallel.

**Architecture:** `apiGet<T>` (in `src/utils/`) wraps `fetch` and throws the existing `apiError`. `useApiQuery<T>` (in `src/hooks/`) wraps `useQuery` + `apiGet`. Each existing hook stays, keeps its name, query key, `enabled` rule and return shape, and becomes a thin typed wrapper. Response types come from the use case behind each route (`ResultOf<typeof useCase>`, type-only import, same precedent as `usePlaySeason`), so they cannot drift from the server.

**Tech Stack:** Next.js 14, TanStack Query v5, vitest + jsdom + @testing-library/react (`renderHook`).

**Spec:** `docs/superpowers/specs/2026-11-25-step11-api-get-helper-design.md`

## Global Constraints

- No changes to callers, routes, query keys, `enabled` conditions, or the POST helpers (`playSeasonPost`, `playTournamentPost`).
- Error messages change on purpose to `apiError`'s format: `Failed to <action> (<status>[ <code>]): <message>`. The `action` for each hook is its old message minus the leading `"Failed to "` (e.g. `"fetch years"`).
- No new `any`. Type-only imports (`import type`) from `@/application/useCases` in hooks - never value imports (server code must not enter the client bundle).
- Import through barrels (`@/src/utils`, `@/src/hooks`), export new modules from them.
- Run tests with `npx vitest run`, type-check with `npx tsc --noEmit`.

## Review Focus

1. Error body that is not JSON (proxy HTML page) -> `apiGet` still throws an `AppError` with the status (`apiError` tolerates it). Test in Task 1.
2. `fetch` itself rejects (offline) -> `apiGet` lets the original error through, unchanged. Test in Task 1.
3. Empty/undefined param (`yearId=""`, `userId=undefined`) -> hook is disabled and does not fetch. Test in Task 3 table.
4. Typed `data` exposes a caller that relied on `any` (e.g. reading a field that doesn't exist) -> `tsc` must stay at its current error count; fix callers by typing, not by casting to `any`. Check in Task 3 and Task 4.
5. `useRestartTheGame` with a failing `/api/years` -> restart still finishes and does not throw. Test in Task 3.

---

### Task 1: `apiGet`

**Files:**
- Create: `src/utils/apiGet.ts`
- Modify: `src/utils/index.ts` (add `export * from "./apiGet";`)
- Test: `tests/unit/utils/apiGet.test.ts`

**Interfaces:**
- Consumes: `apiError(response: Response, action: string): Promise<AppError>` from `src/utils/apiErrorReason.ts`.
- Produces: `apiGet<T>(path: string, action: string): Promise<T>`.

- [ ] **Step 1: Write the failing tests** (stub `fetch` with `vi.stubGlobal` as in `tests/unit/utils/playSeasonPost.test.ts`)
  - `returns the parsed JSON body on 200`: body `[{"id":"y1","year":2025}]` -> resolves to that array; `fetch` called once with `"/api/years"`.
  - `throws an AppError carrying the server's reason`: 500 with `{"error":{"message":"db down","code":"DB_ERROR"}}`, action `"fetch years"` -> rejects with `AppError`, `statusCode` 500, message `"Failed to fetch years (500 DB_ERROR): db down"`.
  - `throws an AppError when the error body is not JSON`: 502 with body `<html>bad gateway</html>` -> message `"Failed to fetch years (502)"`, `statusCode` 502.
  - `lets a network failure through unchanged`: `fetch` rejects with `new TypeError("Failed to fetch")` -> rejects with that same error object.

- [ ] **Step 2: Run** `npx vitest run tests/unit/utils/apiGet.test.ts` - Expected: FAIL (module not found).

- [ ] **Step 3: Implement `apiGet`** - `fetch(path)`; if `!response.ok` throw `await apiError(response, action)`; else `return (await response.json()) as T`. One-line JSDoc.

- [ ] **Step 4: Run** the same command - Expected: PASS (4 tests).

- [ ] **Step 5: Commit** `feat(hooks): add apiGet helper for typed GET requests`

---

### Task 2: `useApiQuery` and `ResultOf`

**Files:**
- Create: `src/hooks/useApiQuery.ts`
- Modify: `src/hooks/index.ts` (export it)
- Test: `tests/unit/hooks/useApiQuery.test.tsx`

**Interfaces:**
- Consumes: `apiGet<T>` (Task 1).
- Produces:
  - `useApiQuery<T>(queryKey: QueryKey, path: string, action: string, options?: { enabled?: boolean }): UseQueryResult<T, Error>` - `useQuery<T>({ queryKey, queryFn: () => apiGet<T>(path, action), enabled: options?.enabled ?? true })`.
  - `type ResultOf<F extends (...args: never[]) => Promise<unknown>> = Awaited<ReturnType<F>>` (exported from the same file).

- [ ] **Step 1: Write the failing tests.** Render with `renderHook` inside a fresh `QueryClientProvider` (`new QueryClient({ defaultOptions: { queries: { retry: false } } })`); stub `fetch`.
  - `fetches the path and returns the data`: key `["years"]`, path `/api/years` -> `waitFor(isSuccess)`, `data` equals the body, `fetch` called with `"/api/years"`.
  - `stores the data under the given query key`: after success, `queryClient.getQueryData(["years"])` equals the body.
  - `does not fetch when enabled is false`: `{ enabled: false }` -> `fetch` not called, `fetchStatus` `"idle"`.
  - `surfaces the apiError on failure`: 404 with `{"error":{"message":"nope"}}`, action `"fetch team"` -> `waitFor(isError)`, `error.message` `"Failed to fetch team (404): nope"`.

- [ ] **Step 2: Run** `npx vitest run tests/unit/hooks/useApiQuery.test.tsx` - Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `useApiQuery` and `ResultOf` with the signatures above.

- [ ] **Step 4: Run** the same command - Expected: PASS (4 tests).

- [ ] **Step 5: Commit** `feat(hooks): add useApiQuery over apiGet`

---

### Task 3: Move the single-query hooks and `useRestartTheGame` onto the helper

Characterization first: the table test pins today's paths, keys and `enabled` rules and must pass **before** the refactor.

**Files:**
- Modify: `src/hooks/useYears.ts`, `useConference.ts`, `useTeam.ts`, `useProfile.ts`, `useTeamStatistics.ts`, `useTopPickedTeamsByUser.ts`, `useTournamentScoringRules.ts`, `useUserBracketsByYearId.ts`, `useUserStatisticsByYearId.ts`, `useRestartTheGame.ts`
- Test: `tests/unit/hooks/queryHooks.test.tsx`, `tests/unit/hooks/useRestartTheGame.test.tsx`

**Interfaces:**
- Consumes: `useApiQuery`, `ResultOf` (Task 2); `apiGet` (Task 1).
- Produces: nothing new; each hook keeps its exported name and return shape.

Hook table (path, query key, action, response type):

| Hook (args) | Path | Query key | Action | Type |
|---|---|---|---|---|
| `useYears()` | `/api/years` | `["years"]` | `fetch years` | `ResultOf<typeof getYears>` |
| `useConference(id)` | `/api/conference/${id}` | `["conference", id]` | `fetch conference` | `ResultOf<typeof getConferenceById>` |
| `useTeam(id)` | `/api/team/${id}` | `["team", id]` | `fetch team` | `ResultOf<typeof getTeamById>` |
| `useProfile(userId)` | `/api/profile/${userId}` | `["profile", userId]` | `fetch user profile` | `ResultOf<typeof getUserProfile>` |
| `useTeamStatistics(yearId)` | `/api/team-statistics/${yearId}` | `["teamStats", yearId]` | `fetch team statistics` | `ResultOf<typeof getTeamStatisticsByYearId>` |
| `useTopPickedTeamsByUser(userId, yearId)` | `/api/pick-count/${userId}/${yearId}` | `["topPickedTeamsByUser", userId, yearId]` | `fetch top picked teams by user` | `ResultOf<typeof getTopPickedTeamsByUserIdAndYearId>` |
| `useTournamentScoringRules(yearId)` | `/api/tournament-scoring-rules/${yearId}` | `["tournamentScoringRuleId", yearId]` | `fetch tournament scoring rules` | `ResultOf<typeof getScoringRuleIdByYearId>` |
| `useUserBracketsByYearId(userId, yearId)` | `/api/brackets/${userId}/${yearId}` | `["userBracketsByYearId", userId, yearId]` | `fetch user brackets by year id` | `ResultOf<typeof getUserBracketsByYearId>` |
| `useUserStatisticsByYearId(userId, yearId)` | `/api/user-statistics/${userId}/${yearId}` | `["userStatisticsByYearId", userId, yearId]` | `fetch user statistics by year id` | `ResultOf<typeof getUserTotalStatsByYearId>` |

`enabled`: no rule for `useYears`; `!!id` / `!!userId` / `!!yearId` for one-arg hooks; both args truthy for two-arg hooks.

- [ ] **Step 1: Write the characterization test** `queryHooks.test.tsx`: an `it.each` over the table rows (call the hook via `renderHook` with sample ids `"u1"`, `"y1"`, `"c1"`). Each case asserts `fetch` was called with the exact path and `queryClient.getQueryData(key)` equals the stubbed body. Second `it.each` over every hook that takes args: with each arg in turn set to `""` (and `undefined` for `useProfile`), `fetch` is not called. For `useUserStatisticsByYearId`, assert on the returned fields instead of `data`: body `{ high_score: 120, total_brackets: 3 }` -> `highScore` 120, `totalBrackets` 3.

- [ ] **Step 2: Run** `npx vitest run tests/unit/hooks/queryHooks.test.tsx` - Expected: PASS against the current hooks (it pins today's behavior).

- [ ] **Step 3: Write the failing `useRestartTheGame` test.** Mock `react-redux`'s `useDispatch` with a `vi.fn()`; stub `fetch`.
  - `sets the latest year after restart`: `/api/years` returns `[{id:"a",year:2024},{id:"b",year:2025}]` -> dispatch received `tournamentActions.setYearId("b")`.
  - `finishes the restart when the years request fails`: 500 -> `restartTheGame()` resolves; `console.error` called with `"Failed to set default year on restart:"` and an `AppError` whose message starts with `"Failed to fetch years (500)"`.
  The second test fails today (old message is `"Failed to fetch years"` without the status).

- [ ] **Step 4: Run** `npx vitest run tests/unit/hooks/useRestartTheGame.test.tsx` - Expected: first PASS, second FAIL on the message.

- [ ] **Step 5: Refactor** each hook in the table to `return useApiQuery<Type>(key, path, action, { enabled })` (keep `useUserStatisticsByYearId`'s field-unpacking return as is, built on `useApiQuery`), and `useRestartTheGame` to `apiGet<ResultOf<typeof getYears>>("/api/years", "fetch years")` inside its existing try/catch. Remove the now-unused `AppError` imports.

- [ ] **Step 6: Run** `npx vitest run tests/unit/hooks` - Expected: PASS. Then `npx tsc --noEmit` - Expected: no new errors versus `main` (compare counts: run once on `main` first and note the number). Fix any caller errors exposed by the new types by correcting types, not with `any`/casts.

- [ ] **Step 7: Commit** `refactor(hooks): build single-query hooks on useApiQuery with typed responses`

---

### Task 4: `useMadnessPrep`

**Files:**
- Modify: `src/hooks/useMadnessPrep.ts`
- Test: `tests/unit/hooks/useMadnessPrep.test.tsx`

**Interfaces:**
- Consumes: `useApiQuery`, `ResultOf` (Task 2).
- Produces: same return object as today (13 data fields + 13 `isLoading*` fields, same names).

Query table - return field / loading field / path (all `/${yearId}`-suffixed) / key (`[name, yearId]`) / action / use case for the type:

| Data field | Loading field | Path | Key name | Action |
|---|---|---|---|---|
| `topPerformingTeams` | `isLoadingMadnessPrep` | `/api/teams/top-performers` | `topPerformingTeams` | `fetch top performing teams` |
| `topPerformingNonPowerConferenceTeams` | `isLoadingTopPerformingNonPowerConferenceTeams` | `/api/teams/top-performers/non-power-conference` | `topPerformingNonPowerConferenceTeams` | `fetch top performing non power conference teams` |
| `topPickedTeams` | `isLoadingTopPickedTeams` | `/api/teams/most-picked` | `topPickedTeams` | `fetch top picked teams` |
| `teamsThatCausedMostUpsets` | `isLoadingTeamsThatCausedMostUpsets` | `/api/teams/upsets/caused` | `teamsThatCausedMostUpsets` | `fetch teams that caused most upsets` |
| `teamsMostUpsetProne` | `isLoadingTeamsMostUpsetProne` | `/api/teams/upsets/prone` | `teamsMostUpsetProne` | `fetch teams most upset prone` |
| `firstRoundSeedMatchupUpsetPercentages` | `isLoadingFirstRoundSeedMatchupUpsetPercentages` | `/api/seeds/first-round/upset-percentage` | `firstRoundSeedMatchupUpsetPercentages` | `fetch first round seed matchup upset percentages` |
| `teamsWithMostChampionships` | `isLoadingTeamsWithMostChampionships` | `/api/teams/appearances/championships` | `teamsWithMostChampionships` | `fetch teams with most championships` |
| `teamsInMostFinals` | `isLoadingTeamsInMostFinals` | `/api/teams/appearances/finals` | `teamsInMostFinals` | `fetch teams in most finals` |
| `teamsInMostFinalFours` | `isLoadingTeamsInMostFinalFours` | `/api/teams/appearances/final-fours` | `teamsInMostFinalFours` | `fetch teams in most final fours` |
| `teamsInMostEliteEights` | `isLoadingTeamsInMostEliteEights` | `/api/teams/appearances/elite-eights` | `teamsInMostEliteEights` | `fetch teams in most elite eights` |
| `teamsInMostSweetSixteens` | `isLoadingTeamsInMostSweetSixteens` | `/api/teams/appearances/sweet-sixteens` | `teamsInMostSweetSixteens` | `fetch teams in most sweet sixteens` |
| `teamsInMostSecondRounds` | `isLoadingTeamsInMostSecondRounds` | `/api/teams/appearances/second-rounds` | `teamsInMostSecondRounds` | `fetch teams in most second rounds` |
| `teamsWithMostTournamentAppearances` | `isLoadingTeamsWithMostTournamentAppearances` | `/api/teams/appearances` | `teamsWithMostTournamentAppearances` | `fetch teams with most tournament appearances` |

Types: keep today's `TeamPerformanceSupabase[]` / `SeedPerformanceSupabase[]` (they match the use cases).

- [ ] **Step 1: Write the characterization test.** Stub `fetch` to answer each URL with a distinct body (e.g. `[{ marker: "<path>" }]`). Render `useMadnessPrep("y1")`, wait until all loading flags are false, then for every row assert: `fetch` was called with `${path}/y1`, `result.current[dataField]` equals that row's body, `queryClient.getQueryData([keyName, "y1"])` equals it, and `result.current[loadingField]` is `false`. Also assert `Object.keys(result.current).sort()` equals the 26 names above, and that `useMadnessPrep("")` makes no `fetch` call.

- [ ] **Step 2: Run** `npx vitest run tests/unit/hooks/useMadnessPrep.test.tsx` - Expected: PASS against the current hook.

- [ ] **Step 3: Refactor** to 13 `useApiQuery` calls (one line each, fixed order) or a module-level row array mapped over with `useApiQuery` - fixed-length array so hook order is stable. Return the same 26 names.

- [ ] **Step 4: Run** the test again and `npx tsc --noEmit` - Expected: PASS, no new tsc errors.

- [ ] **Step 5: Commit** `refactor(hooks): build useMadnessPrep on useApiQuery`

---

### Task 5: Parallel `GetYears` and docs

**Files:**
- Modify: `application/useCases/tournament/GetYears.ts`
- Test: `tests/unit/useCases/tournament/getYears.test.ts` (add a case)
- Modify: `docs/DIAGNOSIS.md` (findings 12 and 32, roadmap row 11), `CLAUDE.md` ("Adding an API endpoint" step 4)

**Interfaces:** `getYears()` signature unchanged.

- [ ] **Step 1: Write the failing test** `should start both repository loads before either finishes`: `mockGetYears` returns a promise that never resolves; call `getYears()` (don't await); `await Promise.resolve()`; expect `mockGetTeamStatsYears` toHaveBeenCalledTimes(1).

- [ ] **Step 2: Run** `npx vitest run tests/unit/useCases/tournament/getYears.test.ts` - Expected: the new test FAILS (called 0 times), the rest PASS.

- [ ] **Step 3: Implement** with `Promise.all([tournamentRepository.getYears(), teamStatsRepository.getYears()])`. The existing "propagate errors" tests must still pass.

- [ ] **Step 4: Run** the same command - Expected: all PASS.

- [ ] **Step 5: Docs.** In `DIAGNOSIS.md` mark finding 12 **Fixed in step 11** (one sentence: `apiGet` + `useApiQuery`, hooks typed from their use cases, error messages now carry the server's reason) and finding 32's `GetYears` part fixed; mark roadmap row 11 done in the table's existing style. In `CLAUDE.md` change "Adding an API endpoint" step 4 to: "Hook `src/hooks/use<Thing>.ts`: `useApiQuery<ResultOf<typeof getThing>>([camelCaseName, ...params], path, \"fetch <thing>\", { enabled: !!param })`."

- [ ] **Step 6: Commit** `perf(years): load both year lists in parallel; docs for step 11`

---

### Task 6: Verify the branch

- [ ] **Step 1:** `npx vitest run` - Expected: all pass.
- [ ] **Step 2:** `npx tsc --noEmit` - Expected: same error count as `main` (only the known CSS-module errors if `next-env.d.ts` is missing).
- [ ] **Step 3:** `npm run lint` - Expected: no new warnings or errors.
- [ ] **Step 4:** `npm run e2e` - Expected: pass (start screen and dashboards load through the new hooks).
