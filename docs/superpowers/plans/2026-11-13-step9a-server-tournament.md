# Step 9a: Tournament on the Server - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The server simulates the tournament, scores it with the database's points and saves bracket, games and picks in one transaction; the browser only replays the results.

**Architecture:** Two PRs. **9a-1** (Tasks 1-3) is database-only: a `persist_bracket(jsonb)` function, `tournament_games.bracket_id`, and removal of all client writes to `user_brackets`/`user_picks`. It is safe with the deployed app, which writes with service-role. **9a-2** (Tasks 4-12) moves the tournament to `POST /api/bracket/simulation`. That route validates the field and picks, runs a pure `simulateTournament`, saves through the RPC, and returns results that the existing drivers dispatch instead of calling `playGame`. Start 9a-2 only after 9a-1 is merged and applied on hosted.

**Tech Stack:** Next.js 14 route handlers, zod 3, TanStack Query 5 (`useMutation` + `throwOnError`), Redux Toolkit, Supabase Postgres + pgTAP, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-server-authoritative-game-design.md`

## Global Constraints

- Gameplay must not change: win odds, possession logic, points (10/20/40/80/160/320), seeding and advancement. Fixed-contract tests and statistical checks in `tests/game/` pass **unchanged**. Only `tests/game/draworder` may be regenerated, with `-u` on that path only, in a commit that changes nothing else, and called out in the PR (`.claude/rules/game-engine.md`).
- The server accepts no result, score or team stat from the browser. The request carries only `yearId`, the field, the picks and `anonUserId`.
- A signed-in player's id comes from the cookie session, never from the request body.
- Import tournament functions by module path (`@/src/functions/tournament/<file>`), never through the `@/src/functions` barrel (it pulls in Firebase).
- Crash copy, exact: heading `Something went wrong`; body `Turnover! A crash report is already on the coach's desk.`
- Never run writes or migrations against the hosted project. The Supabase MCP is read-only; migrations reach hosted only through the merge-to-`main` workflow.
- After each migration: `npx supabase db reset`, `npm run db:types`, and commit `types/database.ts`.
- Every new `persist_bracket` grant is explicit: `revoke execute ... from public, anon, authenticated; grant execute ... to service_role`.
- Branches: `feat/step9a1-persist-bracket` (off `main`) and `feat/step9a2-server-tournament` (off `main` after 9a-1 merges). Conventional commits. The spec and this plan are committed in 9a-1, since no docs-only PRs.

## Review Focus

1. **Picks naming an unknown or play-in placeholder team in a later round.** A placeholder picked to win round 1 must still validate, and must score once replaced by the real play-in winner. Pinned in Task 5 (`placeholder picked through to the final is valid`) and Task 4 (`no placeholder remains in returned picks`).
2. **A field team with no stats for that year,** such as a renamed team. The server must answer 400, not 500 or a crash inside `playGame`. Pinned in Task 7 (`rejects a field team missing from team stats`).
3. **The same team appearing twice in the field.** Pinned in Task 6 (schema `refine`) and Task 7.
4. **Double-pressing Play Tournament.** It must send only one request and save only one bracket. Pinned in Task 9 (`second click while pending sends no second request`).
5. **A slow server response.** The button must show a pending state and nothing may advance until results arrive. Pinned in Task 9 (`phase does not advance while pending`). The e2e reload test (Task 11) holds the request open.

---

# PR 9a-1: database

### Task 1: `persist_bracket` RPC and `tournament_games.bracket_id`

**Files:**
- Create: `supabase/tests/database/21_persist_bracket.test.sql`
- Create: `supabase/migrations/<timestamp>_persist_bracket.sql` (`npx supabase migration new persist_bracket`)
- Modify: `types/database.ts` (regenerated)

**Interfaces:**
- Produces: `public.persist_bracket(payload jsonb) returns uuid` (the new bracket id), executable by `service_role` only. Payload contract, used by Task 7:

```json
{
  "bracket": { "user_id": "uuid|null", "anon_user_id": "uuid|null", "year_id": "uuid",
               "tournament_scoring_rules_id": "uuid", "score": 0 },
  "games": [ { "round_id": "uuid", "is_play_in": false,
               "favored_team_id": "uuid", "favored_team_seed": 1, "favored_team_score": 70,
               "underdog_team_id": "uuid", "underdog_team_seed": 16, "underdog_team_score": 60,
               "winning_team_id": "uuid",
               "pick": { "picked_team_id": "uuid", "picked_team_seed": 1 } } ]
}
```
  `pick` is `null` for the 4 play-in games and present on the other 63.
- Produces: column `tournament_games.bracket_id uuid null references user_brackets(id) on delete cascade`, plus an index on it.

- [ ] **Step 1: Create the branch and commit the spec and plan**

```bash
git checkout -b feat/step9a1-persist-bracket
git add docs/superpowers/specs/2026-11-13-server-authoritative-game-design.md docs/superpowers/plans/2026-11-13-step9a-server-tournament.md
git commit -m "docs: step 9 spec and 9a plan"
```

- [ ] **Step 2: Write the failing pgTAP test**

`21_persist_bracket.test.sql` follows the style of `06_user_brackets.test.sql`: a temp `fx` table and the `tests.*` helpers. Fixtures: year y1 and its rules; year y2 and its rules; teams t1 and t2 in y1; team t3 in y2; two round ids; user A.

In the file, define `pg_temp.payload(p_owner uuid, p_anon uuid, p_rules uuid, p_games int, p_team uuid)`. It returns a valid payload with p_games games. The first 4 are play-in: `pick` null, scores 66 and 61. The rest have pick t1 seed 1, favored t1 seed 1 score 70, underdog `p_team` seed 16 score 60, winner t1. The bracket score is 630.

Assertions (`plan(14)`):
- `has_function('public','persist_bracket',array['jsonb'])`.
- As anon: `throws_ok(select public.persist_bracket(...), '42501')`. The same for authenticated.
- As service_role, with the valid 67-game payload:
  - the call returns a uuid;
  - exactly 1 `user_brackets` row with score 630;
  - 67 `tournament_games` rows with that `bracket_id`;
  - 63 `user_picks` rows;
  - the 4 play-in rows have `favored_team_score = 66`.
- Rejections. Each `throws_ok` uses `'22023'`, followed by an `is()` showing that the bracket count is unchanged:
  - rules from y2 on a y1 bracket;
  - 66 games;
  - a game whose underdog is t3 (wrong year);
  - `winning_team_id` that is neither team;
  - a play-in game with a pick.
- Column check: `col_is_null('public','tournament_games','bracket_id')`.

- [ ] **Step 3: Run it and see it fail**

Run: `npx supabase db start; npx supabase test db`
Expected: `21_persist_bracket` fails (function does not exist). The other files pass.

- [ ] **Step 4: Write the migration**

1. Add `bracket_id` plus the index.
2. Backfill: `public.backfill_tournament_game_brackets()` links picked games through their pick, then gives each unpicked game (legacy play-ins) the one bracket of its year whose games were saved within 5s of it (the old app saved a bracket's games within ~2s; on the hosted DB every one of the 213 unpicked games matched exactly one bracket). The migration calls it; it is idempotent and only the migration role may run it.
3. Create `public.persist_bracket(payload jsonb) returns uuid`, `language plpgsql security invoker set search_path = ''`. It runs these checks in order and raises `using errcode = '22023'` with a message naming the failed check:
   - exactly one owner;
   - the rules' `year_id` equals the bracket `year_id`;
   - `jsonb_array_length(games) = 67`;
   - exactly 4 `is_play_in` games, each with `pick` null;
   - exactly 63 non-null picks;
   - every favored, underdog, winning and picked team id is a `teams` row of the bracket's year;
   - the winner is one of the two teams;
   - the score is at least 0.

   Then it inserts the bracket, inserts the games with `year_id` and `bracket_id` (using `insert ... select from jsonb_to_recordset ... returning`), and inserts the picks joined to the returned game ids by ordinality. Any raise rolls back the whole call.
4. Set the grants as in Global Constraints. Comment the header with the reason (findings 3, 31, 54).

- [ ] **Step 5: Run the tests and see them pass**

Run: `npx supabase db reset; npx supabase test db`
Expected: all files pass.

- [ ] **Step 6: Regenerate types and commit**

```bash
npm run db:types
git add supabase/migrations supabase/tests/database/21_persist_bracket.test.sql types/database.ts
git commit -m "feat(db): persist_bracket RPC saves a bracket in one transaction"
```

### Task 2: Remove client writes on `user_brackets` and `user_picks`

**Files:**
- Modify: `supabase/tests/database/05_user_picks.test.sql`, `06_user_brackets.test.sql`, `07_update_policies.test.sql`
- Create: `supabase/migrations/<timestamp>_revoke_client_bracket_writes.sql`

**Interfaces:**
- Produces: anon and authenticated can only `select` (their own rows) on both tables. service_role is unchanged.

- [ ] **Step 1: Change the tests to expect denial**

- **05 and 06:** each "must keep working" client insert becomes `throws_ok(..., '42501')`. The cross-user delete characterizations become a client-delete denial (`throws_ok` for the delete of own row, or `is()` that the row still exists after the attempt, whichever Postgres reports for a revoked privilege, which is 42501).
- **07:** rewrite the update section as "client update of own bracket / own pick is denied (42501)".
- Keep every service_role assertion and every select-scoping assertion. Update `plan(n)` counts.

- [ ] **Step 2: Run them and see the new assertions fail**

Run: `npx supabase test db`
Expected: the new denial assertions in 05, 06 and 07 fail.

- [ ] **Step 3: Write the migration**

1. `revoke insert, update, delete on public.user_brackets, public.user_picks from anon, authenticated;`
2. Also revoke the column-level grants from `20261109143058` and `20261109145257`.
3. Drop the policies `user_brackets_insert_anon`, `user_brackets_insert_authenticated`, `user_brackets_update_authenticated`, `user_brackets_delete_authenticated`, `user_picks_insert_authenticated`, `user_picks_update_own` and `user_picks_delete_own`.
4. Keep the select policies.
5. Add a header comment: the server is the only writer (findings 25, 26; deletes blocked by the owner's decision).

- [ ] **Step 4: Run all DB tests and see them pass**

Run: `npx supabase db reset; npx supabase test db`
Expected: all pass. If `11_rpc_other` inserts picks as a client role, move that insert to `tests.clear_authentication()` first.

- [ ] **Step 5: Commit**

```bash
npm run db:types   # expect no diff; commit if there is one
git add supabase/migrations supabase/tests/database
git commit -m "fix(db): only the server writes brackets and picks"
```

### Task 3: Database docs and the 9a-1 PR

**Files:**
- Modify: `.claude/rules/database.md`: `persist_bracket` (service-role only, payload shape pointer to the migration), `bracket_id`, and "clients cannot write `user_brackets`/`user_picks`". Remove the "new columns need a column grant" note, since clients no longer write.
- Modify: `docs/DIAGNOSIS.md`: findings 25 and 26 fixed (26's wording corrected: the picked team need not be in the game; bracket consistency is enforced by the server in 9a-2). Step 9 row: "9a-1 done".

- [ ] **Step 1: Make the doc edits above**
- [ ] **Step 2: Verify**

Run: `npx supabase test db; npm run db:types:check; npm run typecheck:db-types; npx vitest run; npm run lint`
Expected: everything passes.

- [ ] **Step 3: Commit, push, open the PR**

The PR body must say:
- additive and safe for the deployed app (writes are service-role);
- the backfill rewrites game rows once, so the stats fingerprint changes and the next cron run does one full rebuild;
- after merge, check on hosted with read-only queries:
  - `select count(*) from tournament_games g where bracket_id is null and exists (select 1 from user_picks p where p.game_id = g.id)` returns `0`;
  - `select has_function_privilege('anon','public.persist_bracket(jsonb)','execute')` returns `false`.

---

# PR 9a-2: tournament on the server

Start only after 9a-1's migrations show as applied on hosted (`mcp__supabase__list_migrations`).

### Task 4: `simulateTournament` and empty-state builders

**Files:**
- Create: `src/functions/tournament/emptyState.ts`, `src/functions/tournament/simulateTournament.ts` (exports the types below, next to `PlayinGameResult`, so `types/` does not import from `src/`)
- Modify: `src/functions/tournament/index.ts`, `store/tournamentSlice.ts`, `store/tournamentPlayersPicksSlice.ts` (initial state comes from the builders)
- Test: `tests/unit/functions/tournament/simulateTournament.test.ts`

**Interfaces:**
- Produces, in `src/functions/tournament/simulateTournament.ts`:

```ts
export interface TournamentField {
  tournamentTeams: string[];                       // the 60 non-play-in teams, rank order
  playinTeams: Record<PlayinSeedType, string[]>;   // 4 each
}
export interface TournamentPlayResult {
  playin: PlayinGameResult[];                              // with scores, in play order
  rounds: Record<ScoredRound, TournamentGameResult[]>;     // seed set on each
  roundPoints: Record<ScoredRound, number>;
  score: number;
}
```
- Produces: `emptyBracket(): BracketMatchups` (today's `tournamentSlice` initial matchup shapes, round one with empty regions and play-in) and `emptyPicks(): TournamentPicks` (today's picks initial state).
- Produces:

```ts
simulateTournament(input: {
  field: TournamentField; picks: TournamentPicks; teamStats: ConferenceMap;
  points: RoundPoints; rng?: () => number;
}): TournamentPlayResult & { bracket: BracketMatchups; picks: TournamentPicks }
```
  `bracket` is the final bracket. `picks` has the play-in placeholders replaced.

- [ ] **Step 1: Write the failing tests**

Fixture: `buildLeague()`. The field is the first 60 team names in league order plus the next 8 split 4/4. The picks are chalk built with `applyPick` over `emptyPicks()`: a local helper `chalkPicks(roundOne)` that walks the rounds the way `tests/game/helpers/runGame.ts` `pickChalk` does. The rng is `mulberry32(7)`.

- `plays 4 play-in games and 32/16/8/4/2/1 games per round`: assert the lengths of `playin` and `rounds[r]`.
- `every play-in result has both scores and the winner has the higher score`.
- `the champion is the finals winner`: `bracket.champion.champion[0][0].team === rounds.finals[0].winningTeam`.
- `no placeholder remains in returned picks`: no slot's team is in `ALL_PLAYIN_PLACEHOLDERS`.
- `score is the sum of roundPoints and matches scoreRound per round`: recompute each round with `scoreRound` and `ROUND_POINTS`.
- `uses the injected points table`: `{1:1,2:1,"sweet sixteen":1,"elite eight":1,"final four":1,finals:1}` gives `score` equal to the count of correct picks.
- `same seed gives the same result` (deep equal across two runs); `does not mutate inputs` (deep-freeze field, picks and teamStats).
- `throws GameDataError for a field team with no stats`.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/unit/functions/tournament/simulateTournament.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`emptyState.ts` returns fresh copies of the existing initial shapes. Change both slices to use them, with no behavior change.

`simulateTournament` does the following:
1. Build a team-to-stats lookup from `teamStats`.
2. Set `seeds = seedTournament(field.tournamentTeams)` and round one from `buildRoundOneMatchups(seeds, field.playinTeams)`, into `emptyBracket()`.
3. Play the play-in games in `elevenSeeds`, then `sixteenSeeds` order, game index ascending, with `playGame(a, b, rng)` and `getTournamentGameResultObj`. Apply each with `applyPlayinResult` including both scores, and with `replacePlayinPlaceholder` on picks.
4. For each round in `SCORED_ROUNDS`, iterate regions in the bracket's key order (`west, east, south, midwest`; then `eastWest, southMidwest`; then `championship`) and games in index order. This matches `PlayTournamentGames` exactly, so the draw order is unchanged. Set `seed` from the matchup and apply with `applyGameResult`.
5. After each round, call `scoreRound({ round, advanced: picks[nextPicksKey], picks: picks[nextPicksKey], winningTeams, points })`.

- [ ] **Step 4: Run them and see them pass, then run the game suite**

Run: `npx vitest run tests/unit/functions/tournament tests/game`
Expected: PASS. The slices' initial state is unchanged.

- [ ] **Step 5: Commit**: `feat(tournament): pure simulateTournament for the server`

### Task 5: `validateBracketPicks`

**Files:**
- Create: `src/functions/tournament/validateBracketPicks.ts`
- Test: `tests/unit/functions/tournament/validateBracketPicks.test.ts`

**Interfaces:**
- Produces: `validateBracketPicks(roundOne: TournamentRoundMatchups, picks: TournamentPicks): string[]`, which returns one message per problem (empty means valid).

- [ ] **Step 1: Write the failing tests**

They use the same league field and chalk helper as Task 4; move `chalkPicks` to `tests/factories/picks.factory.ts` and export it from the factories barrel.
- `chalk picks are valid` (returns `[]`).
- `placeholder picked through to the final is valid`: pick the 16-seed play-in placeholder in every round of its path.
- `an empty slot is reported`.
- `a round-two pick that is not in its round-one game is reported`.
- `a later pick that is neither feeder pick is reported`.
- `a pick whose seed differs from the team's seed is reported`.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/unit/functions/tournament/validateBracketPicks.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

For each round `r` in `SCORED_ROUNDS` and each game `(region, i)` of round `r`, the two candidate teams are:
- in round 1, `roundOne[region][i]`;
- otherwise, `picks[ROUND_CONFIG[prev].nextPicksKey][region][i]`, where `prev` is the round before `r`.

The pick slot is `picks[ROUND_CONFIG[r].nextPicksKey][nextRegionOf(r, region)][Math.floor(i/2)][ROUND_CONFIG[r].advance[region]?.teamIndex ?? i % 2]`. It must equal one candidate in both team and seed. Iterate the round-`r` games using the shape of the candidates' source (round 1: the four seed regions; later rounds: that pick round's regions).

- [ ] **Step 4: Run them and see them pass**
- [ ] **Step 5: Commit**: `feat(tournament): validate a bracket's picks are consistent`

### Task 6: Request schema

**Files:**
- Create: `app/api/bracket/simulation/schema.ts`
- Test: `tests/unit/api/simulationSchema.test.ts`

**Interfaces:**
- Produces: `SimulationRequestSchema` (zod, `.strict()` at every object level) and `type SimulationRequestBody = z.infer<typeof SimulationRequestSchema>`:
  - `yearId`: uuid;
  - `field`: `{ tournamentTeams: string.min(1)[] of length 60, playinTeams: { elevenSeeds: length 4, sixteenSeeds: length 4 } }`, refined so all 68 names are distinct;
  - `picks`: exact `TournamentPicks` shape. Region keys and matchup counts: `roundTwoPicks` 4 regions × 4 × 2; `roundSweetSixteenPicks` 4 × 2 × 2; `roundEliteEightPicks` 4 × 1 × 2; `roundFinalFourPicks` `eastWest` and `southMidwest` × 1 × 2; `roundFinalsPicks` `championship` × 1 × 2; `champion` `champion` × 1 × 1. Each slot is `{ team: string.min(1), seed: string.regex(/^(1[0-6]|[1-9])$/) }`;
  - `anonUserId`: uuid, nullable, optional.

- [ ] **Step 1: Write the failing tests**

Accepts a valid body built from Task 5's chalk factory. Rejects each of the following:
- `userId` present;
- `playerScore` present;
- 59 teams;
- a duplicate team across `tournamentTeams` and `playinTeams`;
- a missing region;
- 3 matchups in a region;
- an empty team;
- seed `"17"`;
- a non-uuid `yearId` or `anonUserId`.

- [ ] **Step 2: Run them and see them fail**
- [ ] **Step 3: Implement the schema**
- [ ] **Step 4: Run them and see them pass**
- [ ] **Step 5: Commit**: `feat(api): full zod schema for the tournament request`

### Task 7: `playTournament` use case, repository and payload mapper

**Files:**
- Create: `application/useCases/tournament/PlayTournament.ts`, `application/mappers/mapBracketToPayload.ts`, `models/appStatsData/PersistBracketPayload.ts`
- Modify: `application/useCases/tournament/index.ts`, `infrastructure/db/TournamentRepository.ts`, `models/appStatsData/index.ts`
- Delete: `application/useCases/tournament/PersistTournament.ts`, `application/mappers/mapTournamentToRows.ts`, `tests/unit/useCases/tournament/persistTournament.test.ts`
- Test: `tests/unit/useCases/tournament/playTournament.test.ts`, `tests/unit/mappers/mapBracketToPayload.test.ts` (move the cases from `mapTournamentToRows.test.ts`, changed to the new shape)

**Interfaces:**
- Consumes: `simulateTournament`, `TournamentField`, `TournamentPlayResult` (Task 4); `validateBracketPicks` (Task 5); `SimulationRequestBody` (Task 6); RPC payload (Task 1).
- Produces:

```ts
// models/appStatsData/PersistBracketPayload.ts
export interface PersistBracketPick { picked_team_id: string; picked_team_seed: number }
export type PersistBracketGame = Omit<GameInsertSupabase, "year_id" | "bracket_id" | "id" | "created_at"> & { pick: PersistBracketPick | null };
export interface PersistBracketPayload { bracket: Omit<BracketInsertSupabase, "id" | "created_at">; games: PersistBracketGame[] }

// application/mappers/mapBracketToPayload.ts
mapBracketToPayloadGames(input: { bracket: BracketMatchups; picks: TournamentPicks;
  teamIdMap: Map<string, string>; roundIdMap: Map<TournamentRound, string> }): PersistBracketGame[]

// TournamentRepository
getRoundPoints(): Promise<RoundPoints>                 // tournament_round_scoring join rounds
persistBracket(payload: PersistBracketPayload): Promise<string>   // supabase.rpc("persist_bracket", { payload })

// application/useCases/tournament/PlayTournament.ts
export interface PlayTournamentDto { yearId: string; field: TournamentField; picks: TournamentPicks;
  userId: string | null; anonUserId: string | null }
export type PlayTournamentResult = TournamentPlayResult & { bracketId: string };
playTournament(dto: PlayTournamentDto): Promise<PlayTournamentResult>
```
- Remove `persistBracket(bracket)`/`persistTournament(...)` and the `authClient` from `TournamentRepository`. This fixes finding 5.

- [ ] **Step 1: Write the failing tests**

Mock `TournamentRepository` and `getTeamStatisticsByYearId` with `vi.mock`, and use `buildLeague` stats.
- `loads stats, teams, rounds, points and scoring rules in parallel`: all five mocks have been called before any of them resolves (use deferred promises).
- `saves one payload with the server score and 67 games, 63 with picks`.
- `returns bracketId, playin, rounds, roundPoints and score, but not bracket or picks`.
- `signed-in: bracket.user_id = userId and anon_user_id = null`.
- `anonymous: anon_user_id set`.
- `neither owner throws ValidationError`.
- `rejects a field team missing from team stats` (ValidationError).
- `rejects a field team missing from the year's teams table` (ValidationError).
- `rejects inconsistent picks` (ValidationError, with the `validateBracketPicks` messages joined).
- `propagates a repository error`.

Mapper tests: the existing cases are ported, with `pick` nested instead of `bracket_id`. Add `play-in rows carry real scores`.

- [ ] **Step 2: Run them and see them fail**
- [ ] **Step 3: Implement**

The use case:
1. Run `Promise.all` of the five loads.
2. Check that the field teams exist in the stats lookup and in `teamIdMap`.
3. Build round one, with `seedTournament` and `buildRoundOneMatchups`, for `validateBracketPicks`.
4. Call `simulateTournament(..., rng = Math.random)`.
5. Build the payload with `tournament_scoring_rules_id` from the repository, not from the client.
6. Call `persistBracket`.

The mapper keeps today's favored/underdog and pick-index logic.

Errors from the `persist_bracket` RPC are server errors (500) whatever their SQLSTATE: malformed ids raise 22P02 and check failures 22023, but the payload is server-built, so a failure is our bug, never the client's. Never map them to 400; only `ValidationError`s from the use case's own checks are 400.

- [ ] **Step 4: Run them and see them pass**

Run: `npx vitest run tests/unit; npx tsc --noEmit`
Expected: PASS. `tsc` checks the RPC name and args.

- [ ] **Step 5: Re-backfill `tournament_games.bracket_id`**

Brackets the deployed (old) app saves between the 9a-1 merge and this PR's merge have `bracket_id` null on all their games. Write the pgTAP test first (`supabase/tests/database/`, next free number): seed a legacy bracket with a null-`bracket_id` game plus a pick on it, and a play-in game with no pick saved within 5s of it; run the migration's statement as postgres (service_role cannot execute the function), assert both games get the bracket id. Test 21 already covers the function's edge cases. See it fail. Then:

Run: `npx supabase migration new rebackfill_tournament_games_bracket_id`

The migration re-runs the same idempotent function as 9a-1:

```sql
select public.backfill_tournament_game_brackets();
```

Run `npx supabase db reset; npx supabase test db` (pass), then `npm run db:types` (expect no diff). In the PR body, note that a bracket saved in the seconds between the migration and the Vercel deploy could still be missed, and the same statement can be re-run by hand.

- [ ] **Step 6: Commit**: `feat(tournament): server plays, scores and saves the tournament`

### Task 8: Route

**Files:**
- Modify: `app/api/bracket/simulation/route.ts`
- Create: `utils/api/getSessionUserId.ts` (`getSessionUserId(): Promise<string | null>`, which reads `createSupabaseServerClient().auth.getUser()` and returns null on no user or on error)
- Test: `tests/integration/bracketSimulation.test.ts` (rewrite)

**Interfaces:**
- Consumes: `SimulationRequestSchema` (Task 6), `playTournament` (Task 7).
- Produces: `POST /api/bracket/simulation` returns `201 PlayTournamentResult`; `400` for a schema or `ValidationError` failure. The existing middleware (method, content type, origin, rate limit 20/min) is kept.

- [ ] **Step 1: Write the failing tests**

Mock `playTournament` and `getSessionUserId`.
- `201 with the use case result`.
- `session user wins: userId from session, anonUserId null even if sent`.
- `no session: anonUserId from body`.
- `400 when body has userId`.
- `400 when body has playerScore`.
- `400 for malformed picks`.
- `400 when the use case throws ValidationError`.
- `500 shape on a generic error`.
- The existing content-type and origin cases are kept.

- [ ] **Step 2: Run them and see them fail**
- [ ] **Step 3: Implement the route** with the `try/catch` + `handleApiError` pattern.
- [ ] **Step 4: Run them and see them pass**
- [ ] **Step 5: Commit**: `feat(api): tournament route takes picks and returns server results`

### Task 9: Browser request, drivers replay server results, crash on failure

**Files:**
- Create: `src/utils/playTournamentPost.ts`, `src/hooks/usePlayTournament.ts`
- Modify: `src/utils/index.ts`, `src/hooks/index.ts`, `src/components/UI/PlayTournamentButton.tsx`, `store/tournamentSlice.ts`, `src/components/Tournament/PlayPlayinGames.tsx`, `src/components/Tournament/PlayTournamentGames.tsx`, `src/components/App.tsx`, `src/components/Tournament/index.ts`, `tests/game/helpers/runGame.ts`
- Delete: `src/components/Tournament/TournamentPersist.tsx`, `src/hooks/usePersistTournament.ts`, `src/utils/persistTournamentPost.ts`
- Test: `src/components/UI/__tests__/PlayTournamentButton.test.tsx`, `tests/game/tournamentDrivers.test.tsx` (additions)

**Interfaces:**
- Consumes: `TournamentPlayResult` (Task 4), `SimulationRequestBody` (Task 6), `PlayTournamentResult` (Task 7).
- Produces:
  - `tournamentSlice` gains `simulation: TournamentPlayResult | null` (initially `null`, cleared by `restartGame`) and `setSimulation(PayloadAction<TournamentPlayResult>)`.
  - `recordRoundScore`'s payload gains `points: number`. The reducer adds `points` to `playerScore`, and uses `scoreRound` only for the `selected` marks.
  - `playTournamentPost(body: SimulationRequestBody): Promise<PlayTournamentResult>` throws `AppError` on `!ok`.
  - `usePlayTournament()` returns `useMutation({ mutationFn: playTournamentPost, throwOnError: true })`.

- [ ] **Step 1: Write the failing tests**

`PlayTournamentButton.test.tsx` renders inside `GameErrorBoundary` with a real store holding a chalk bracket. It mocks `fetch` and `@/src/utils/crashReporting`.
- `posts yearId, field, picks and anonUserId, then stores the result and starts the play-in phase`.
- `phase does not advance while pending`.
- `second click while pending sends no second request`.
- `a failed request shows the crash screen and reports the crash`.

Additions to `tournamentDrivers.test.tsx`:
- `drivers dispatch exactly the stored simulation's results`;
- `playerScore equals simulation.score`;
- `PlayTournamentGames with no simulation crashes with GameDataError`.

Change `runGame.ts` `playTournament` first. After `pickChalk`, it calls `simulateTournament` with `rng` defaulting to `Math.random` (seeded by the caller), using the store's field and picks, `store.getState().teamStats.teamStats` and `ROUND_POINTS`. It dispatches `setSimulation` with the result's `playin`, `rounds`, `roundPoints` and `score`, then activates the play-in phase.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/components/UI tests/game`
Expected: the new tests fail. The `tests/game/draworder` pins also fail at this step, because the helper now draws through `simulateTournament` while the drivers still call `playGame`, which doubles the draws. Step 3 removes the drivers' draws.

- [ ] **Step 3: Implement**

- **Drivers:** read `state.tournament.simulation`, and throw `GameDataError("no tournament results", ...)` if it is null. Dispatch `replacePlayinPicksWithWinner` + `setPlayinGameResults` (now with scores) for each `playin` result, and `setTournamentGameResults` for each `rounds[r]` result. Dispatch `recordRoundScore` with `winningTeams` taken from the results and `points: roundPoints[r]`. Keep the effect chain and the phase flags exactly as they are; nothing else changes.
- **Button:** on click, mutate with:
  - `yearId`;
  - `field` `{ tournamentTeams, playinTeams }`;
  - `picks`;
  - `anonUserId: user ? null : getAnonUserId()`.

  On success, dispatch `setSimulation` and then `activateTournamentPlayinGamesState`. While pending the button is disabled and shows the existing basketball graphic with the label "Tipping off...".
- **App:** remove `TournamentPersist` from `App.tsx` and from the barrel.

- [ ] **Step 4: Run them and see them pass, fixed contract and stats unchanged**

Run: `npx vitest run tests/game src/components tests/unit`
Expected: PASS, including every `tests/game/draworder` pin, because draws happen in the same order through `simulateTournament`. If a draw-order pin fails while all fixed-contract and statistical tests pass, follow the regeneration procedure in Global Constraints in a separate commit.

- [ ] **Step 5: Commit**: `feat(tournament): browser replays server results; failed request crashes`

### Task 10: Crash screen copy

**Files:**
- Modify: `src/components/General/CrashScreen.tsx`, `src/components/General/__tests__/CrashScreen.test.tsx`

- [ ] **Step 1: Write the failing test.** The test expects the text `Turnover! A crash report is already on the coach's desk.` and that the old sentence is gone.
- [ ] **Step 2: Run it and see it fail.** Run: `npx vitest run src/components/General`
- [ ] **Step 3: Replace the paragraph text** (HTML-escape the apostrophe).
- [ ] **Step 4: Run it and see it pass.** Also run `tests/unit/app`; the heading is unchanged.
- [ ] **Step 5: Commit**: `feat(ui): crash screen says a report was sent, with a basketball joke`

### Task 11: End-to-end tests

**Files:**
- Modify: `e2e/support/fakeBackend.ts`, `e2e/checks/results.ts`, `e2e/auth.spec.ts`, `e2e/game-flow.spec.ts`, `e2e/save-failure.spec.ts` (rename it to `e2e/tournament-failure.spec.ts`), `.claude/rules/e2e.md`
- Test: `tests/unit/e2e/*` if they cover `checkPersistPayload`

**Interfaces:**
- Consumes: `simulateTournament`, `ROUND_POINTS` (by module path), `SimulationRequestBody`, `PlayTournamentResult`.

- [ ] **Step 1: Update the specs to the new contract**

- **Fake backend:** `POST /api/bracket/simulation` records the body, then answers `opts.persistStatus ?? 201`. On success the answer is `simulateTournament({ field, picks, teamStats: e2eTeamStats(yearId), points: ROUND_POINTS })` without `bracket` and `picks`, plus `bracketId: "e2e-bracket"`.
- **`checkPersistPayload`:**
  - signed in means `anonUserId` is null; anonymous means it equals the stored id;
  - there is no `userId` key;
  - `field` has 60 + 4 + 4 teams;
  - every recorded pick is in `body.picks`, with placeholders still unreplaced.
- **`tournament-failure.spec.ts`:** with `persistStatus: 500`, after `makePicks` press Play. The heading `Something went wrong` and the Turnover sentence are visible, and "Start a new game" returns to the start screen. Allowlist the console 500 with the reason `"failed tournament request shows crash screen"`.
- **`game-flow` reload test:** hold the request open, reload while it is pending (assert `appState.tournamentSelection` is true and the request has started), then expect a clean start.

- [ ] **Step 2: Run e2e**

Run: `npm run e2e`
Expected: all pass, with no unhandled fake-backend routes.

- [ ] **Step 3: Update `.claude/rules/e2e.md`** (the fake backend simulates the tournament; the save-failure entry is replaced).
- [ ] **Step 4: Commit**: `test(e2e): tournament comes from the fake server; failure shows crash screen`

### Task 12: Docs, full verification and the 9a-2 PR

**Files:**
- Modify:
  - `CLAUDE.md`: rewrite "Persisting a bracket": `PlayTournamentButton` → `usePlayTournament` → `POST /api/bracket/simulation` → `playTournament` → `simulateTournament` + `persist_bracket`; identity from the session.
  - `.claude/rules/game-engine.md`: the tournament runs in `simulateTournament` on the server; the drivers only replay `tournament.simulation`.
  - `docs/DIAGNOSIS.md`:
    - findings 1, 3, 5, 31, 32 (`PlayTournament` part), 43 and 54 fixed;
    - finding 6 fixed, with wording corrected (points are global in `tournament_round_scoring`, not per year);
    - step 9 row: 9a done, 9b next.

- [ ] **Step 1: Make the doc edits**
- [ ] **Step 2: Verify everything** (`superpowers:verification-before-completion`)

Run: `npx vitest run; npm run lint; npx tsc --noEmit; npm run build; npm run e2e`
Expected: all pass. `tests/game` takes under about 40 s.

- [ ] **Step 3: Push and open the PR**

The PR body must say:
- the save moved to picks-lock;
- the browser no longer simulates the tournament;
- whether the draw-order pins were regenerated (expected: no);
- finding 54 changes stored play-in scores from 0 to real.
