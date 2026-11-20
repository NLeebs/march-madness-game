# Step 9b: Regular Season and Selection Sunday on the Server - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The server plays the regular season and Selection Sunday and signs the field it picked; the browser replays the season and the tournament request can only use a signed field.

**Architecture:** A pure `simulateSeason` (schedule → 30 weeks of `playGame` → records → `selectTournamentField`) runs in `POST /api/season`, which returns the season in a compact form plus an HMAC-SHA256 field token. The browser expands it into the existing Redux actions, so `PlayRegularSeasonGames` and `SelectionSunday` only replay. `POST /api/bracket/simulation` takes `fieldToken` instead of `yearId` + `field` and reads both from the verified token. One PR, no migration.

**Tech Stack:** Next.js 14 route handlers, Node `crypto` (HMAC, `timingSafeEqual`), zod 3, TanStack Query 5 (`useMutation` + `throwOnError`), Redux Toolkit, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-step9b-server-season-design.md` (parent: `docs/superpowers/specs/2026-11-13-server-authoritative-game-design.md`)

## Global Constraints

- Gameplay must not change: schedule rules, win odds, records (`NUMBER_OF_TEAMS - opponentRPI + POINTS_PER_WIN` per win), selection, seeding. Fixed-contract tests and statistical checks in `tests/game/` keep their **assertions** unchanged; only how a test reaches the code under test (helpers, `run()` setup) may change. Only `tests/game/draworder` may be regenerated, with `npx vitest run -u tests/game/draworder`, in a commit that changes nothing else, called out in the PR (`.claude/rules/game-engine.md`). Expected: no pin changes, because `simulateSeason` draws schedule then games in today's order.
- The season replay keeps today's timing exactly: every week's `delay(TIMER_PER_REGULAR_SEASON_GAME)` started together, the same actions in the same order (`addRegularSeasonGameResult` per game in schedule order, `addWeekPlayedToTotal` per week, then `activateSelectionSunday` at 30 weeks).
- Selection Sunday dispatch order is unchanged: `addConferenceChampion` × conferences, `setPlayinTeams` 16-seeds then 11-seeds, `addTournamentTeams`, `setTournamentSeeds`.
- The tournament request body is exactly `{ fieldToken, picks, anonUserId? }` (strict). Year and field come only from the verified token.
- Token: `base64url(JSON {v:1, yearId, field, iat})` + `.` + `base64url(HMAC-SHA256(secret, first part))`; expiry **24 hours**; `iat` up to **5 minutes** in the future accepted; every rejection is `ValidationError` with the exact message `The tournament field is invalid or expired`; a missing or < 32-character secret throws a plain `Error` (500).
- `GAME_SIGNING_SECRET` is server-only: never `NEXT_PUBLIC_`, and `utils/api/fieldToken.ts` is never imported from `src/` or `store/`. Never print a real secret value in logs, commits or reports.
- `/api/season` middleware matches the tournament route: POST, `application/json`, origin check, `rateLimit(60, 60000)`.
- A failed season request goes to `GameErrorBoundary` (crash screen + Sentry) with the server's reason in the error message.
- Import engine functions by module path (`@/src/functions/regularSeason/<file>`, `@/src/functions/tournament/<file>`) from server code, never through `@/src/functions` (it pulls in Firebase).
- Branch `feat/step9b-server-season` (exists, spec committed). Conventional commits. No hosted writes.

## Review Focus

1. **Double-clicking Start.** One season request only. Pinned in Task 6 (`a second Start click sends no second season request`).
2. **Season response slower than the transition.** The board waits at 0-0 and replays when the response lands; nothing crashes or advances early. Pinned in Task 6 (`replay waits for the season and then plays all 30 weeks`).
3. **A token signed with another secret, edited, or older than 24 hours.** 400 with the generic message, before any data load. Pinned in Task 3 and Task 5 (`bad token is rejected before any load`).
4. **Play Again after a finished game.** The old season and token are cleared and the next Start requests a fresh season. Pinned in Task 6 (`restartGame clears season and fieldToken`).
5. **An environment without `GAME_SIGNING_SECRET`.** A 500 that is reported, never a 400 blaming the player. Pinned in Task 3 (`missing secret throws a plain Error, not ValidationError`) and Task 4 (`a missing secret rejects with a plain Error, not ValidationError`).

---

### Task 1: Pure season simulation

**Files:**
- Create: `src/functions/regularSeason/applySeasonGameResult.ts`, `src/functions/regularSeason/simulateSeason.ts`
- Modify: `src/functions/regularSeason/index.ts`, `store/regularSeasonRecordSlice.ts` (reducer calls `applySeasonGameResult`)
- Test: `tests/unit/functions/regularSeason/simulateSeason.test.ts`, `tests/unit/functions/regularSeason/applySeasonGameResult.test.ts`

**Interfaces:**
- Produces:

```ts
// applySeasonGameResult.ts — mutates `records` in place (works on an Immer draft)
export function applySeasonGameResult(records: Record<string, RegularSeasonTeam>, result: GameResult): void;

// simulateSeason.ts
export interface SeasonSimulation {
  teamArray: TeamSchedule[];                   // conference keys then team keys, Object.keys order (as teamScheduleConfig)
  schedule: ScheduledGame[];                   // createSeasonSchedule output
  weeks: GameResult[][];                       // weeks[0] = week1 ... weeks[29] = week30, games in schedule order
  records: Record<string, RegularSeasonTeam>;  // final, no confChampion flags
  selection: TournamentFieldSelection;
}
export function simulateSeason(teamStats: ConferenceMap, rng?: () => number): SeasonSimulation;
```

- [ ] **Step 1: Write the failing tests**

`applySeasonGameResult.test.ts` (two-team records, hand-built `GameResult`s):
- `favored win: +1 win, +1 loss, winner gets 360 - underdogRPI + 75`
- `underdog win: winner gets 360 - favoredRPI + 75`

`simulateSeason.test.ts` (`buildLeague()`, `mulberry32(7)`):
- `teamArray matches teamScheduleConfig order` (compare with the slice's `teamArray` after `configureStoreForLeague`)
- `30 weeks; every scheduled game is played once, in schedule order` (flatten `weeks`, compare team pairs with `schedule` grouped by `weekNumber`, as sets of names per game)
- `records equal folding applySeasonGameResult over weeks from zeroed records`
- `selection equals selectTournamentField(records, conferenceArrays)`
- `same seed gives the same result`; `does not mutate teamStats` (deep-freeze)
- `matches the browser path draw for draw`: with `seedMathRandom(1)` run today's path (`configureStoreForLeague` + `playSeason` from `tests/game/helpers/runGame.ts`), then with `seedMathRandom(1)` run `simulateSeason(league.teamStats)`; records and draw counts are equal. This proves the Task 6 switch is draw-neutral; Task 6 deletes this one test once the helper itself runs `simulateSeason` (the `tests/game/draworder` pins carry the proof from then on).

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/unit/functions/regularSeason`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`applySeasonGameResult` is the body of today's `addRegularSeasonGameResult`; the reducer becomes `applySeasonGameResult(state.records, action.payload)`. `simulateSeason` builds `teamArray`/`conferenceArrays` exactly as `teamScheduleConfig`/`addConferenceArrays` do, calls `createSeasonSchedule(teamStats, teamArray, rng)`, groups games by `weekNumber` in `week1..week30` order, plays each with `playGame(statsA, statsB, rng)` (A = `matchup[0]`, as `PlayRegularSeasonGames` does), folds results with `applySeasonGameResult` from zeroed `{wins:0, losses:0, tournamentSelectionScore:0}` records, then `selectTournamentField`.

- [ ] **Step 4: Run them and the game suite**

Run: `npx vitest run tests/unit/functions/regularSeason tests/game`
Expected: PASS, every `tests/game` file unchanged (nothing in the app uses `simulateSeason` yet).

- [ ] **Step 5: Commit**: `feat(season): pure simulateSeason and shared record update`

### Task 2: Compact season wire format

**Files:**
- Create: `src/functions/regularSeason/seasonWire.ts`
- Modify: `src/functions/regularSeason/index.ts`
- Test: `tests/unit/functions/regularSeason/seasonWire.test.ts`

**Interfaces:**
- Consumes: `SeasonSimulation` (Task 1).
- Produces:

```ts
/** [team index A, team index B, A's score, B's score]; A/B in schedule (matchup) order. */
export type SeasonWireGame = [number, number, number, number];
export interface SeasonWire {
  teams: TeamSchedule[];           // = SeasonSimulation.teamArray
  weeks: SeasonWireGame[][];       // 30 weeks
  selection: TournamentFieldSelection;
}
export function compactSeason(season: SeasonSimulation): SeasonWire;
/** Rebuilds the schedule and each GameResult; favored = A unless +rpi(A) > +rpi(B) (playGame's rule). */
export function expandSeason(wire: SeasonWire, teamStats: ConferenceMap): {
  schedule: ScheduledGame[]; weeks: GameResult[][]; selection: TournamentFieldSelection;
};
```

- [ ] **Step 1: Write the failing tests** (`buildLeague()`, `simulateSeason(teamStats, mulberry32(3))`)
- `round trip: expandSeason(compactSeason(s)).weeks deep-equals s.weeks` (this pins the favored/RPI rule, ties included)
- `round trip: schedule deep-equals s.schedule`
- `JSON size of the wire is under 25% of JSON.stringify({schedule, weeks})` (records the compaction is real)
- `expandSeason throws GameDataError for a team missing from teamStats`

- [ ] **Step 2: Run them and see them fail**: `npx vitest run tests/unit/functions/regularSeason/seasonWire.test.ts`
- [ ] **Step 3: Implement** (index lookup by `team` name built once; no other logic).
- [ ] **Step 4: Run them and see them pass**
- [ ] **Step 5: Commit**: `feat(season): compact wire format for season results`

### Task 3: Field token

**Files:**
- Create: `utils/api/fieldToken.ts`
- Modify: `src/test-setup.ts` (stub `GAME_SIGNING_SECRET` with a fixed 48-character test value), `.env.local` (local secret, see Step 5; gitignored, never committed)
- Test: `tests/unit/api/fieldToken.test.ts`

**Interfaces:**
- Consumes: `TournamentField` (`@/src/functions/tournament/simulateTournament`).
- Produces:

```ts
export interface FieldClaims { yearId: string; field: TournamentField; }
export interface VerifiedField extends FieldClaims { issuedAt: number; } // ms epoch
export const FIELD_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const FIELD_TOKEN_INVALID = "The tournament field is invalid or expired";
export function signFieldToken(claims: FieldClaims, opts?: { now?: number; secret?: string }): string;
export function verifyFieldToken(token: string, opts?: { now?: number; secret?: string }): VerifiedField;
```
  `secret` defaults to `process.env.GAME_SIGNING_SECRET`. `iat` is stored in seconds.

- [ ] **Step 1: Write the failing tests**
- `round trip returns yearId, field and issuedAt`
- `tampered payload` (flip a team name in the decoded JSON, re-encode, keep signature) → `ValidationError` with `FIELD_TOKEN_INVALID`
- `tampered signature`, `wrong secret`, `malformed` (`""`, `"abc"`, `"a.b.c"`, non-JSON payload), `wrong version` (`v: 2` signed correctly) → same `ValidationError`
- `expired`: verify at `iat + 24h + 1s` fails; at `iat + 24h - 1s` passes
- `future iat`: signed at `now + 6 min` fails; at `now + 4 min` passes
- `missing secret throws a plain Error, not ValidationError`; `31-character secret throws a plain Error`
- `token never contains the secret` (string search)

- [ ] **Step 2: Run them and see them fail**: `npx vitest run tests/unit/api/fieldToken.test.ts`
- [ ] **Step 3: Implement** with `createHmac("sha256", secret)`, `Buffer.from(...).toString("base64url")`, and `timingSafeEqual` on equal-length buffers (length mismatch = reject). Validate the decoded payload shape with a small strict zod schema (60 + 4 + 4 team strings, uuid `yearId`, integer `iat`, `v === 1`).
- [ ] **Step 4: Run them and see them pass**
- [ ] **Step 5: Local secret.** If `.env.local` has no `GAME_SIGNING_SECRET`, append `GAME_SIGNING_SECRET=<value>` where the value comes from `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` piped straight into the file (never echoed to output). Confirm with `git check-ignore .env.local` that it is ignored.
- [ ] **Step 6: Commit** (code and `src/test-setup.ts` only): `feat(api): HMAC field token for the server-picked tournament field`

### Task 4: `POST /api/season`

**Files:**
- Create: `app/api/season/route.ts`, `app/api/season/schema.ts`, `application/useCases/season/PlaySeason.ts`, `application/useCases/season/index.ts`
- Modify: `application/useCases/index.ts`
- Test: `tests/unit/useCases/season/playSeason.test.ts`, `tests/unit/api/seasonSchema.test.ts`, `tests/integration/season.test.ts`

**Interfaces:**
- Consumes: `simulateSeason` (Task 1), `compactSeason` (Task 2), `signFieldToken` (Task 3), `getTeamStatisticsByYearId`, `TournamentRepository.findBracketScoringRulesByYearId`.
- Produces:

```ts
export const SeasonRequestSchema = z.object({ yearId: z.string().uuid() }).strict();
export type PlaySeasonResult = SeasonWire & { yearId: string; fieldToken: string };
export async function playSeason(input: { yearId: string }): Promise<PlaySeasonResult>;
```
  `POST /api/season` returns `200 PlaySeasonResult`; `400` for schema or `ValidationError`.
  Token field: `tournamentTeams = selection.field`, `playinTeams = { elevenSeeds: selection.elevenSeedPlayins, sixteenSeeds: selection.sixteenSeedPlayins }`.

- [ ] **Step 1: Write the failing tests**

Use case (mock `getTeamStatisticsByYearId` → `buildLeague().teamStats`, mock the repository's `findBracketScoringRulesByYearId`):
- `unknown year (no scoring rules) is a ValidationError` and team stats are not used
- `the token verifies and carries the selection's field and the yearId`
- `weeks expand to 30 weeks covering every team` (via `expandSeason`)
- `a team-stats load failure is rethrown (server error)`

Schema: `accepts a uuid`; `rejects extra keys`; `rejects a non-uuid`.

Use case, also: `a missing secret rejects with a plain Error, not ValidationError` (`vi.stubEnv("GAME_SIGNING_SECRET", "")`), so the route answers 500.

Route (mock `playSeason`): `200 with the use case result`; `400 for a bad body`; `400 when the use case throws ValidationError`; `500 shape on a generic error`; the content-type and origin cases copied from `tests/integration/bracketSimulation.test.ts`.

- [ ] **Step 2: Run them and see them fail**: `npx vitest run tests/unit/useCases/season tests/unit/api/seasonSchema.test.ts tests/integration/season.test.ts`
- [ ] **Step 3: Implement** the use case, schema and route following `app/api/bracket/simulation/route.ts` (same middleware list, `try/catch` + `handleApiError(e, "/api/season")`). The use case calls `simulateSeason(teamStats, Math.random)`.
- [ ] **Step 4: Run them and see them pass**
- [ ] **Step 5: Commit**: `feat(api): POST /api/season plays the season and signs the field`

### Task 5: Tournament request takes the token

**Files:**
- Modify: `app/api/bracket/simulation/schema.ts`, `app/api/bracket/simulation/route.ts`, `application/useCases/tournament/PlayTournament.ts`, `src/utils/playTournamentPost.ts` (request type), `store/tournamentSlice.ts` (`fieldToken`), `src/components/UI/PlayTournamentButton.tsx`
- Test: `tests/unit/api/simulationSchema.test.ts`, `tests/unit/useCases/tournament/playTournament.test.ts`, `tests/integration/bracketSimulation.test.ts`, `src/components/UI/__tests__/PlayTournamentButton.test.tsx`, `tests/unit/utils/playTournamentPost.test.ts`

**Interfaces:**
- Consumes: `verifyFieldToken` (Task 3).
- Produces:
  - `SimulationRequestSchema = { fieldToken: z.string().min(1), picks, anonUserId? }`, strict. `field` and `yearId` removed.
  - `PlayTournamentDto = { fieldToken: string; picks; userId; anonUserId }`. `playTournament` calls `verifyFieldToken` first and takes `yearId`/`field` from it; the existing checks (duplicates, size, stats, teams, picks) stay.
  - `PlayTournamentRequest = Omit<SimulationRequestBody, "picks"> & { picks: TournamentPicks }`.
  - `tournamentSlice`: `fieldToken: string` (initial `""`, cleared by `restartGame`), `setFieldToken(PayloadAction<string>)`.
  - `PlayTournamentButton` sends `{ fieldToken, picks, anonUserId }`.

- [ ] **Step 1: Write the failing tests**
- Schema: `accepts fieldToken + picks`; `rejects a body with field`; `rejects a body with yearId`; `rejects a missing fieldToken`.
- Use case: `bad token is rejected before any load` (ValidationError with `FIELD_TOKEN_INVALID`; stats and repository mocks not called); `year and field come from the token` (repository called with the token's `yearId`; the bracket payload's `year_id` equals it). Rewrite the existing cases to build their input with `signFieldToken`.
- Route: `passes fieldToken to the use case`; the identity cases are kept.
- Button: `posts fieldToken, picks and anonUserId` (store preloaded with `fieldToken: "t"`; body has no `field`/`yearId`).
- Slice: `restartGame clears fieldToken`.

- [ ] **Step 2: Run them and see them fail**: `npx vitest run tests/unit/api tests/unit/useCases/tournament tests/integration/bracketSimulation.test.ts src/components/UI tests/unit/utils`
- [ ] **Step 3: Implement.** The route passes `body.fieldToken` through; the use case verifies at the top (before the owner check is fine either way, but before every load).
- [ ] **Step 4: Run them and see them pass**, then `npx vitest run` (e2e is updated in Task 7).
- [ ] **Step 5: Commit**: `feat(tournament): tournament request carries the signed field token`

### Task 6: Browser fetches and replays the season

**Files:**
- Create: `src/utils/playSeasonPost.ts`, `src/hooks/usePlaySeason.ts`, `src/utils/storeSeason.ts`
- Modify: `src/utils/index.ts`, `src/hooks/index.ts`, `src/components/UI/StartButton.tsx`, `store/regularSeasonRecordSlice.ts`, `src/components/RegularSeason/PlayRegularSeasonGames.tsx`, `src/components/RegularSeason/RegularSeason.tsx`, `src/components/RegularSeason/SelectionSunday.tsx`, `src/components/App.tsx`, `src/components/RegularSeason/index.ts`, `tests/game/helpers/runGame.ts`, `tests/game/helpers/fullRun.ts`, `tests/game/selectionSunday.test.tsx` (`run()` only), `tests/unit/functions/regularSeason/simulateSeason.test.ts` (delete the draw-for-draw test)
- Modify: `tests/game/seasonSchedule.test.tsx` — the schedule-invariant cases call `createSeasonSchedule` directly instead of rendering the component (same assertions); the component-only cases (`dispatches the whole schedule as one setSeasonSchedule action`, `does nothing when the team array is empty`) are deleted with the component
- Modify: `tests/game/draworder/seasonSchedule.draworder.test.tsx` — calls `createSeasonSchedule(league.teamStats, teamArray)` under `seedMathRandom(1)` and builds the same digest, so the existing pin must still match
- Delete: `src/components/RegularSeason/SeasonSchedule.tsx`
- Test: `src/components/UI/__tests__/StartButton.test.tsx` (create), `src/components/RegularSeason/__tests__/PlayRegularSeasonGames.test.tsx` (rewrite), `tests/game/regularSeason.test.tsx` (helpers only)

**Interfaces:**
- Consumes: `PlaySeasonResult` (Task 4), `expandSeason` (Task 2), `setFieldToken` (Task 5).
- Produces:
  - `regularSeasonRecordSlice`: `season: { weeks: GameResult[][]; selection: TournamentFieldSelection } | null` (initial `null`, cleared by `restartGame`), `setSeason(PayloadAction<...>)`.
  - `storeSeason(dispatch: Dispatch, result: PlaySeasonResult, teamStats: ConferenceMap): void` (`Dispatch` from `@reduxjs/toolkit`) — `expandSeason`, then dispatches `teamScheduleActions.setSeasonSchedule(schedule)`, `regularSeasonRecordActions.setSeason({ weeks, selection })`, `tournamentActions.setFieldToken(result.fieldToken)`.
  - `playSeasonPost({ yearId }): Promise<PlaySeasonResult>` — throws `AppError` with the server's reason on `!ok` (reuse `playTournamentPost`'s reason reader; move it to a shared `src/utils/apiErrorReason.ts` if both need it).
  - `usePlaySeason()` = `useMutation({ mutationKey: ["playSeason"], mutationFn: playSeasonPost, throwOnError: true })`.

- [ ] **Step 1: Write the failing tests**

Change `runGame.ts` `playSeason(store, league)` first: build `simulateSeason(league.teamStats)` (Math.random, seeded by the caller), wrap with `compactSeason` + `{ yearId: "test-year", fieldToken: "test-token" }`, call `storeSeason`, then render `PlayRegularSeasonGames` and advance timers as today. Change `selectionSunday.test.tsx` `run()` to preload `regularSeasonRecords.season = { weeks: [], selection: selectTournamentField(records, league.conferenceArrays) }` alongside the records it already preloads; no assertion changes.

New/rewritten tests:
- `StartButton.test.tsx` (real store, mocked `fetch`, inside `GameErrorBoundary` + `QueryClientProvider`): `Start posts the yearId to /api/season and stores the season and token`; `a second Start click sends no second season request`; `a failed season request shows the crash screen and reports the crash` (mock `@/src/utils/crashReporting`).
- `PlayRegularSeasonGames.test.tsx`: `replays the stored weeks: one addRegularSeasonGameResult per game in order, 30 addWeekPlayedToTotal, then activateSelectionSunday`; `replay waits for the season and then plays all 30 weeks` (render with `season: null`, advance 5 s, assert no game actions; then dispatch `setSeason`, advance, assert the full replay); `never calls playGame` (spy via module mock of `@/src/functions/playGame`).
- `SelectionSunday`: `throws GameDataError when no season is stored` (rendered inside an error boundary).
- Slice: `restartGame clears season and fieldToken`.

- [ ] **Step 2: Run them and see them fail**: `npx vitest run src/components tests/game tests/unit`

- [ ] **Step 3: Implement**
  - `StartButton`: on click (ref guard against a second click), `mutate({ yearId }, { onSuccess: (r) => storeSeason(dispatch, r, teamStats) })` at the same time as today's transition; `teamStats` from `state.teamStats.teamStats`. Errors in the click path go through the same `setSubmitError` rethrow pattern as `PlayTournamentButton`.
  - `PlayRegularSeasonGames`: drop the `teamStats` prop; read `regularSeasonRecords.season`; if null, do nothing yet. When present and `weeksPlayed === 0`, start every week's `delay(TIMER_PER_REGULAR_SEASON_GAME)` together and dispatch each stored result, as today. Update `RegularSeason.tsx` to stop passing the prop.
  - `SelectionSunday`: dispatch from `season.selection` (same actions, same order, same `tournamentTeams.length === 0` guard); throw `GameDataError("no season results", {})` if `season` is null.
  - `App.tsx`: remove `SeasonSchedule`; delete the component and its barrel export.

- [ ] **Step 4: Run them and see them pass, fixed contract and stats unchanged**

Run: `npx vitest run tests/game src/components tests/unit`
Expected: PASS including every `tests/game/draworder` pin. If only a draw-order pin fails while every fixed-contract and statistical test passes, regenerate with `npx vitest run -u tests/game/draworder` in its own commit and record why.

- [ ] **Step 5: Commit**: `feat(season): browser replays the server's season and Selection Sunday`

### Task 7: End-to-end tests

**Files:**
- Modify: `e2e/support/fakeBackend.ts`, `e2e/support/simulationRequest.ts`, `e2e/checks/results.ts`, specs that assert on the tournament body (`e2e/game-flow.spec.ts`, `e2e/auth.spec.ts`), `.claude/rules/e2e.md`
- Create: `e2e/season-failure.spec.ts`
- Test: `tests/unit/e2e/simulationRequest.test.ts`

**Interfaces:**
- Consumes: `simulateSeason`, `compactSeason`, `signFieldToken`/`verifyFieldToken` (with an explicit `secret: E2E_SIGNING_SECRET` exported from `e2e/support/env.ts`; the fake backend runs in the Playwright process, not the Next server).
- Produces: `FakeBackendOptions.seasonStatus?: number` (default 200); `FakeBackend.seasonRequests: { yearId: string }[]`.

- [ ] **Step 1: Update the fakes and specs**
  - `POST /api/season`: record the body; `seasonStatus >= 400` answers with an `apiError` body; else `compactSeason(simulateSeason(teamStats))` + `yearId` + `fieldToken` signed with `E2E_SIGNING_SECRET`.
  - `checkSimulationRequest` verifies the token with `E2E_SIGNING_SECRET` (bad token → 400 with `FIELD_TOKEN_INVALID`) and takes field and year from it; the unit test covers `rejects an unsigned field`.
  - `checkPersistPayload`: the body has `fieldToken`, no `field`, no `yearId`; the token's field has 60 + 4 + 4 teams.
  - `season-failure.spec.ts`: `seasonStatus: 500`; press Start; the heading `Something went wrong` and the Turnover sentence are visible; "Start a new game" returns to the start screen. Allowlist the console 500 with reason `"failed season request shows crash screen"`.
- [ ] **Step 2: Run e2e**: `npm run e2e` — all pass, no unhandled fake-backend routes.
- [ ] **Step 3: Update `.claude/rules/e2e.md`** (season fake, token, new failure spec).
- [ ] **Step 4: Commit**: `test(e2e): season comes from the fake server; tournament needs its token`

### Task 8: Load check, docs, verification and the PR

**Files:**
- Modify: `CLAUDE.md` (Environment: `GAME_SIGNING_SECRET`, server-only, ≥ 32 chars, separate per environment; "Persisting a bracket": `fieldToken` replaces `yearId`/`field`; "Two kinds of state": season and Selection Sunday come from `POST /api/season`), `.claude/rules/game-engine.md` (loop steps 1-3 run in `simulateSeason` on the server; `PlayRegularSeasonGames`/`SelectionSunday` replay `regularSeasonRecords.season`; `SeasonSchedule` gone; helpers list), `docs/DIAGNOSIS.md` (finding 1 fixed; step 9 row done), `docs/superpowers/specs/2026-11-13-server-authoritative-game-design.md` (9b section points to the 9b spec)

- [ ] **Step 1: Measure.** `npm run build`, then `npm start` with `GAME_SIGNING_SECRET` from `.env.local`; POST `/api/season` for the latest real year 5 times with `curl -s -o NUL -w "%{time_total} %{size_download}\n"` (origin header `http://localhost:3000`, plus once with `--compressed`). Record median time and sizes. Budget: under 2 s. Over budget → stop and report with a profile, do not change the encoding blindly.
- [ ] **Step 2: Make the doc edits.**
- [ ] **Step 3: Verify everything** (`superpowers:verification-before-completion`): `npx vitest run; npm run lint; npx tsc --noEmit; npm run build; npm run e2e`. All pass; `tests/game` under about 40 s.
- [ ] **Step 4: Push and open the PR.** The body says: the server plays season and Selection Sunday; the tournament request carries a signed field token (closes the made-up-field gap); whether draw-order pins changed (expected: no); the measured time and size; owner pre-merge check that `GAME_SIGNING_SECRET` is set in Vercel Production and Preview (done 2026-11-20); open tabs during deploy crash once.
