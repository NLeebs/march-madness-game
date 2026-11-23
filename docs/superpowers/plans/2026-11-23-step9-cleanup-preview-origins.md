# Step 9 Cleanup + Preview Play-Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Vercel previews play a full game without saving it, tighten the origin check to exact matches, and clear the 9a-2 leftovers.

**Architecture:** The allow-list gains the deployment's own Vercel hosts and is normalized to URL origins; `validateOrigin` compares origins exactly. `playTournament` skips `persistBracket` when `VERCEL_ENV === "preview"`. Type and map cleanups move shared shapes down a layer.

**Tech Stack:** Next.js 14 route handlers, TypeScript, zod, vitest.

**Spec:** `docs/superpowers/specs/2026-11-23-step9-cleanup-preview-origins-design.md`

## Global Constraints

- Branch `chore/step9-cleanup-preview-origins` (off `main` at `c2322b5`); one PR; conventional commits.
- Preview check is exactly `process.env.VERCEL_ENV === "preview"`; unset or `"production"`/`"development"` saves as today.
- Vercel hosts come from `VERCEL_URL` and `VERCEL_BRANCH_URL` (host only, no scheme), prefixed with `https://`.
- No migrations. Game engine, draw-order pins and e2e fake behavior unchanged.
- Never commit `tests/game/draworder/__snapshots__/fullRun.draworder.test.tsx.snap` (it shows `M` after vitest from line endings only).
- No new `any`. Import game functions by module path, not the `@/src/functions` barrel, from server code.

## Review Focus

- An allow-list entry with a trailing slash or path (`https://madnessgame.app/`) must match the browser's `Origin` `https://madnessgame.app`. (Task 1 test)
- Look-alikes must fail: `https://madnessgame.app.evil.com`, `http://madnessgame.app`, `https://madnessgame.app:8443`, in both `Origin` and `Referer`. (Task 1 test)
- A malformed env value (`NEXT_PUBLIC_STAGING_URL="not a url"`) is skipped, not thrown on every request. (Task 1 test)
- `VERCEL_ENV` unset or `"production"` still calls `persistBracket` and returns its id. (Task 2 test)
- A preview request with bad picks or a bad token still fails with 400 before the skipped save. (Task 2 test)

---

### Task 1: Allowed origins from Vercel hosts, exact origin matching

**Files:**
- Modify: `utils/api/allowedOrigins.ts`, `utils/errorHandling/apiSecurity.ts` (`validateOrigin` only)
- Test: `tests/unit/utils/allowedOrigins.test.ts` (create), `tests/unit/utils/validateOrigin.test.ts` (create)

**Interfaces:**
- Produces: `getAllowedOrigins(): string[]` returns deduplicated URL origins (`new URL(x).origin`), skipping values that don't parse. Sources, in order: `NEXT_PUBLIC_APP_URL`; in production `https://www.madnessgame.app`, `https://madnessgame.app`; `NEXT_PUBLIC_STAGING_URL`; `https://${VERCEL_URL}`; `https://${VERCEL_BRANCH_URL}`.
- Produces: `validateOrigin(allowedOrigins, allowLocalhost)` same signature; passes when `Origin` equals an allowed origin after `new URL(...).origin` normalization, or (no matching `Origin`) when `new URL(referer).origin` equals one. Development localhost rule unchanged.

- [ ] **Step 1: Write failing tests** (use `vi.stubEnv`, `vi.unstubAllEnvs` in `afterEach`; build requests with `new NextRequest("https://x/api", { headers })`)
  - `allowedOrigins`: `"adds the deployment and branch hosts"` - `VERCEL_URL="app-abc.vercel.app"`, `VERCEL_BRANCH_URL="app-git-x.vercel.app"` → contains `"https://app-abc.vercel.app"` and `"https://app-git-x.vercel.app"`.
  - `"normalizes to origins"` - `NODE_ENV="production"` → contains `"https://madnessgame.app"`, no entry ends with `/`.
  - `"skips values that are not URLs"` - `NEXT_PUBLIC_STAGING_URL="not a url"` → does not throw, length unchanged vs unset.
  - `"has no duplicates"` - `NEXT_PUBLIC_APP_URL="https://madnessgame.app/"`, production → `"https://madnessgame.app"` appears once.
  - `validateOrigin(["https://madnessgame.app"], true)`: passes for `Origin: https://madnessgame.app`; passes for `Origin: https://madnessgame.app` when list entry is `"https://madnessgame.app/"`; throws `ValidationError` code `INVALID_ORIGIN` for `Origin` `https://madnessgame.app.evil.com`, `http://madnessgame.app`, `https://madnessgame.app:8443`; with no `Origin`, passes for `Referer: https://madnessgame.app/some/page`, throws for `Referer: https://madnessgame.app.evil.com/x` and `http://madnessgame.app/x`; throws with neither header.

- [ ] **Step 2: Run and confirm failures are the missing Vercel hosts / look-alikes passing**

Run: `npx vitest run tests/unit/utils/allowedOrigins.test.ts tests/unit/utils/validateOrigin.test.ts`
Expected: FAIL - Vercel hosts absent, entries keep their trailing slash, and the `Origin` with a trailing-slash list entry is rejected.

- [ ] **Step 3: Implement both functions** per Interfaces (a small `toOrigin(value): string | null` helper with try/catch around `new URL`).

- [ ] **Step 4: Run the two files plus `tests/integration/bracketSimulation.test.ts tests/integration/season.test.ts`** - Expected: PASS.

- [ ] **Step 5: Commit** - `fix(api): exact origin match; allow the deployment's own Vercel hosts`

### Task 2: Previews play the tournament without saving it

**Files:**
- Modify: `application/useCases/tournament/PlayTournament.ts`
- Test: `tests/unit/useCases/tournament/playTournament.test.ts`

**Interfaces:**
- Produces: `PlayTournamentResult = TournamentPlayResult & { bracketId: string | null }` (still exported from `PlayTournament.ts` in this task; Task 3 moves it).

- [ ] **Step 1: Write failing tests** in the existing file (reuse its valid-input setup):
  - `"on a preview deployment, plays and scores but does not save"` - `vi.stubEnv("VERCEL_ENV", "preview")` → `persistBracket` not called; result `bracketId` is `null`; result `score` and `rounds` equal what the same rng-free assertions in the existing happy-path test check (score is a number, 6 scored rounds present).
  - `"on a preview deployment, still rejects inconsistent picks"` - preview + the file's existing inconsistent-picks input → rejects with `ValidationError`.
  - `"in production, saves"` - `VERCEL_ENV="production"` → `persistBracket` called once, `bracketId === "bracket-uuid"`.

- [ ] **Step 2: Run** `npx vitest run tests/unit/useCases/tournament/playTournament.test.ts` - Expected: the first test FAILS (`persistBracket` called).

- [ ] **Step 3: Implement** - after building the result, `if (process.env.VERCEL_ENV === "preview") return { bracketId: null, ...result };` before building the payload; update the doc comment.

- [ ] **Step 4: Run the file and `tests/integration/bracketSimulation.test.ts`** - Expected: PASS.

- [ ] **Step 5: Commit** - `feat(tournament): preview deployments play without saving`

### Task 3: Tournament API types live in `types/`

**Files:**
- Create: `types/tournament/PlayTournamentApi.ts`; export from `types/tournament/index.ts`
- Modify: `src/utils/playTournamentPost.ts`, `application/useCases/tournament/PlayTournament.ts`, `app/api/bracket/simulation/schema.ts`, `e2e/support/simulationRequest.ts`, `e2e/support/fakeBackend.ts`, `tests/unit/utils/playTournamentPost.test.ts`, `src/components/UI/__tests__/PlayTournamentButton.test.tsx` (if it names the type)

**Interfaces:**
- Produces (from `@/types`): `PlayTournamentRequest = { fieldToken: string; picks: TournamentPicks; anonUserId?: string | null }` and `PlayTournamentResult = TournamentPlayResult & { bracketId: string | null }`. `TournamentPlayResult` is a type-only import by module path from `@/src/functions/tournament/simulateTournament`.
- `PlayTournament.ts` re-exports nothing new; it imports `PlayTournamentResult` from `@/types`. `SimulationRequestBody` stays in `schema.ts` for the route and e2e.

- [ ] **Step 1: Write the failing guard** - in `schema.ts`, a compile-time key check that `SimulationRequestBody` and `PlayTournamentRequest` have the same keys (e.g. `type SameKeys<A, B> = [keyof A] extends [keyof B] ? ([keyof B] extends [keyof A] ? true : false) : false; const _requestKeysMatch: SameKeys<SimulationRequestBody, PlayTournamentRequest> = true;`). Run `npx tsc --noEmit` - Expected: FAIL (`PlayTournamentRequest` not exported from `@/types`).

- [ ] **Step 2: Create the types file and switch every importer** listed above; `playTournamentPost.ts` imports only from `@/types` and `./apiErrorReason`.

- [ ] **Step 3: Verify** - `npx tsc --noEmit` passes (aside from the 2 known CSS-module errors if `next-env.d.ts` is missing); `grep -n "@/app\|@/application" src/utils/playTournamentPost.ts` prints nothing; sabotage once: add a key to `PlayTournamentRequest`, confirm `tsc` fails on `_requestKeysMatch`, revert.

- [ ] **Step 4: Run** `npx vitest run tests/unit/utils/playTournamentPost.test.ts src/components/UI/__tests__/PlayTournamentButton.test.tsx` - PASS.

- [ ] **Step 5: Commit** - `refactor: tournament API types in types/`

### Task 4: One round-name map

**Files:**
- Create: `infrastructure/db/roundNames.ts` (export from `infrastructure/db` barrel if one exists)
- Modify: `application/useCases/tournament/PlayTournament.ts`, `infrastructure/db/TournamentRepository.ts`
- Test: `tests/unit/infrastructure/roundNames.test.ts` (create)

**Interfaces:**
- Produces: `ROUND_BY_NAME: Readonly<Record<string, TournamentRound>>` (the 7 entries now in `PlayTournament.ts`) and `scoredRoundByName(name: string): ScoredRound | undefined` (same map minus `champion`).

- [ ] **Step 1: Failing test** - `ROUND_BY_NAME["sweet sixteen"] === "sweet sixteen"`, `ROUND_BY_NAME["1"] === 1`, 7 keys; `scoredRoundByName("champion")` is `undefined`; `scoredRoundByName("finals") === "finals"`; `scoredRoundByName("bogus")` is `undefined`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/infrastructure/roundNames.test.ts` - FAIL (module missing).
- [ ] **Step 3: Implement and replace both local maps.** `TournamentRepository`'s "missing rounds" check iterates the six scored rounds (use `SCORED_ROUNDS` from `src/functions/tournament/roundConfig` by module path, or `Object.values` of the filtered map).
- [ ] **Step 4: Run** the new test plus `tests/unit/useCases/tournament/` and any `tests/unit/infrastructure/` TournamentRepository tests - PASS.
- [ ] **Step 5: Commit** - `refactor: one round-name map for use case and repository`

### Task 5: Remove `NEXT_PUBLIC_APP_MODE`; docs

**Files:**
- Modify: `e2e/support/env.ts`, `tests/game/picksAndScoring.test.ts` (drop the APP_MODE guard test/assertion), `tests/unit/store/tournamentPlayersPicksSlice.test.ts` (drop the stub), `CLAUDE.md` (env paragraph: drop APP_MODE text; add "`VERCEL_ENV`, `VERCEL_URL`, `VERCEL_BRANCH_URL` are set by Vercel: the deployment's own hosts pass the origin check, and preview deployments play the tournament without saving it"), `docs/DIAGNOSIS.md` (new low finding or note under finding 1: previews skip saving; `getSessionUserId` outage fallback recorded as accepted), `.claude/rules/e2e.md` only if it mentions APP_MODE
- Local only (gitignored, not committed): delete the `NEXT_PUBLIC_APP_MODE` lines in `.env` and `.env.local` (check `git check-ignore .env` first; if `.env` is tracked, edit and commit it)

- [ ] **Step 1:** `grep -rn "APP_MODE" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs .` lists the files above.
- [ ] **Step 2:** Remove each use; re-run the grep - Expected: only `CLAUDE.md` history wording gone too, zero hits outside `docs/`.
- [ ] **Step 3:** `npx vitest run tests/game/picksAndScoring.test.ts tests/unit/store/tournamentPlayersPicksSlice.test.ts` - PASS.
- [ ] **Step 4: Commit** - `chore: drop NEXT_PUBLIC_APP_MODE; document preview behavior`

### Task 6: Verify and open the PR

- [ ] `npx vitest run`, `npm run lint`, `npx tsc --noEmit`, `npm run e2e` (stop anything on port 3100 first) - all pass.
- [ ] Push; open the PR with spec + plan; after the preview deploys, play a full game on the branch's preview URL (`march-madness-game-git-<branch>-nleebs-projects.vercel.app`): `/api/season` 200, `/api/bracket/simulation` 201 with `bracketId: null`, and a read-only query shows no new `user_brackets` row. If the origin check still fails, the Vercel system env vars aren't exposed: report to the owner.
