# Step 9: server-authoritative game and atomic bracket save

Date: 2026-11-13. Roadmap step 9 in `docs/DIAGNOSIS.md`, split into **9a** (tournament) and **9b** (regular season and Selection Sunday), built and shipped in that order as two PRs.

## Why

Nobody has gamed the leaderboard yet. The owner wants it closed the standard way anyway: anything that affects a saved score is computed by the server, never accepted from the browser. Today the browser simulates every game, computes the score and posts both to `POST /api/bracket/simulation`, which saves them as-is (finding 1). The save itself is ~126 separate inserts that can leave half a bracket behind (findings 3, 31).

Two rules make the leaderboard trustworthy:

1. **Picks are locked on the server before any result exists.** Otherwise a player could simulate locally, see results, then change picks.
2. **Results come from the server.** The server runs the simulation; the browser only displays what it is given.

## Goals

- The server simulates the tournament (9a) and later the regular season and Selection Sunday (9b), computes the score with the database's points table, and saves bracket, games, picks and score in one transaction.
- The browser keeps showing the game exactly as today: the season still reveals game by game so teams rise and fall in the standings; the tournament still plays out round by round with the current screens.
- Presentation stays fully browser-side, so future work (an animation revamp; slowing the tournament so it plays out game by game) is a UI change only. The server returns all results up front; the browser chooses the pace.
- A failed server call stops the game on the crash screen and reports to Sentry. The crash screen gets new copy with some humor and says a crash report was sent.

## Non-goals

- The animation revamp and slowing the tournament reveal (future features this design enables).
- Incremental stats refresh (findings 27, 28). Step 9 unblocks it; it stays its own change.
- Moving team stats from Firebase to Supabase.
- Component decomposition (step 10), `strict` (step 12), RLS-first data access (step 13).

## Anti-goals (failure even if it works)

- Any change to how the game plays: win odds, possession logic, schedule rules, selection, seeding, points values. The engine moves, the game does not. Characterization tests prove it (see Testing).
- The server accepting any result, score or team stat from the browser.
- A bracket that is partly saved.
- A save failure the player never hears about (finding 43).

## Facts the design rests on (checked 2026-11-13)

- Players fill in the whole bracket, play-in picks included, before any game is played (`PlayTournamentButton` is enabled only when every pick is made). Then `PlayPlayinGames` and `PlayTournamentGames` run every game in a chain of effects, and `TournamentPersist` saves at the recap.
- Play-in picks are replaced by the actual play-in winners before round 1 is scored (`replacePlayinPicksWithWinner`). The server must do the same.
- `playGame`, `createSeasonSchedule`, `selectTournamentField`, `seedTournament`, `buildRoundOneMatchups`, `applyGameResult`, `applyPlayinResult` and `scoreRound` are pure functions with an injectable `rng` where they draw. They can run in a route handler as they are.
- Team stats are static for a year (the `teamStats` slice only loads them). The server reads them itself from Firebase via `getTeamStatisticsByYearId`, as `/api/team-statistics/[yearId]` already does.
- **Points are not per year.** `tournament_round_scoring` is one global row per round (`round_id`, `score`); `tournament_scoring_rules` holds only a per-year id/description, no points. Hosted values are 10/20/40/80/160/320, identical to `ROUND_POINTS`, so moving scoring to the server changes no score. Finding 6's "per year" wording is wrong; correct it in `DIAGNOSIS.md`.
- Every bracket stores its own 67 `tournament_games` rows (hosted: 52 brackets, 3,484 games).
- **Finding 26's suggested rule is wrong for this data model.** A pick row is the player's pick for the winner of a game slot. If the player's team lost earlier, the picked team is legitimately *not* one of that game's two teams. The right rule is that the bracket is internally consistent (each pick is one of the player's own picks feeding that slot, or one of the actual teams in round 1). Timing is solved by rule 1: picks and results are written together, by the server only.

## 9a: tournament on the server

### Flow

1. The player finishes their picks and presses Play Tournament. The browser posts the field and picks to the server and shows a loading state.
2. The server validates the request, loads what it needs **in parallel** (team stats, team ids for the year, round ids, points table, the year's `tournament_scoring_rules` id) (finding 32).
3. The server rebuilds the bracket from the field with the same pure functions the browser uses (it does not accept client matchups), plays the play-in games, swaps play-in winners into the play-in picks, plays rounds 1 to finals, and scores each round with `scoreRound` and the DB points.
4. One `persist_bracket` call saves bracket, games, picks and score in one transaction.
5. The server returns the results and score. The browser feeds them into the existing reducers round by round with the existing screens. The browser no longer calls `playGame` for the tournament and no longer computes the saved score.

The save moves from the recap to the moment picks are locked. One request does both simulate and save, so there is no in-between state to keep in sync. `TournamentPersist` is deleted.

### Endpoint

Keep the path `POST /api/bracket/simulation` (the name now fits) with a new contract. Keep the existing origin check, content-type check and rate limit.

- **Request (full zod schema, no `z.any()`):** `yearId`, the field (the 68 tournament teams with the seeding inputs the browser holds after Selection Sunday; the builder picks the minimal shape from which `seedTournament`/`buildRoundOneMatchups` rebuild the bracket), the complete picks object, and `anonUserId` (uuid) for logged-out players.
- **User identity comes from the session, not the body.** A signed-in player's id is read from the cookie session (`supabaseServer`); a logged-out player's bracket uses `anonUserId`. This replaces the body `userId` and the unused `getUser()` check (finding 5).
- **Validation, 400 on failure:** the year exists; the field is 68 distinct teams that all exist in that year's team stats and `teams` table, with a valid seed layout; the picks object has every slot; every pick is consistent (round-1-feeding picks are teams in that matchup, play-in picks are one of the two play-in teams, each later pick is one of the player's two picks feeding that slot). The field check here is structural only; 9b replaces it with a signature.
- **Response:** `bracketId`, every game result in a shape the existing reducers accept (play-in and each round), points per round and the total. Exact shape is the builder's call.

### Shipping order (my call)

Migrations auto-apply on merge while Vercel deploys the same push, so the new app could go live before `persist_bracket` exists and crash every tournament. 9a ships as two PRs: **9a-1** the migration only (`persist_bracket`, `bracket_id` and backfill, grant changes, pgTAP, regenerated types); everything in it is additive or unused by the deployed app. **9a-2** the app code, after 9a-1 is applied on hosted.

### Simulation module

A pure `simulateTournament({ field, picks, teamStats, points, rng })` in `src/functions/tournament/`, used by the route. It plays games in the same order the components do today (play-in by seed type, then each round by region and index) so the change in draw order is only "who calls it". Import `scoreRound` and the other tournament functions by module path, not through the `@/src/functions` barrel (the barrel pulls in Firebase).

### Database: `persist_bracket`

- New migration with `public.persist_bracket(payload jsonb) returns uuid`. Inserts the `user_brackets` row (including `score`), the 67 `tournament_games` rows and the 63 `user_picks` rows in one transaction; any error rolls back everything.
- Execute granted to `service_role` only; revoked from `public`, `anon`, `authenticated`.
- **My call: add `tournament_games.bracket_id`** (nullable uuid, FK to `user_brackets`, `on delete cascade`, indexed). Today a game belongs to a bracket only through a pick, and the 4 play-in games have no pick, so nothing ties them to their bracket. `persist_bracket` always sets it. Backfill existing rows from `user_picks` (63 of 67 per bracket), and the unpicked play-in rows from the one bracket saved within 5s of them (`backfill_tournament_game_brackets()`, decided in the PR #20 review). Stats SQL keeps working unchanged; finding 27 can later use the column.
- **My call: save real play-in scores** (fixes finding 54). The server has them, so writing 0 would be deliberately wrong. Check that the stats SQL that reads `is_play_in` rows is unaffected; play-in scores were 0/undefined before, so any stat that reads them changes going forward, so call it out in the PR.
- Checks inside the function as defence in depth: exactly one owner; the scoring rules id belongs to the bracket's year (finding 25); exactly 67 games (4 play-in) and 63 picks; every team id belongs to the year; every pick's game has this bracket's `bracket_id`.
- With the server as the only writer, revoke client `insert`, `update` and `delete` on `user_brackets` and `user_picks` from `anon` and `authenticated`, and drop the matching insert/update/delete policies (my call for insert/update; **delete is the owner's decision**: a client deleting low-scoring brackets would inflate `user_total_stats`, and deleting single picks would leave a broken bracket; no app feature deletes them). A future "delete my bracket/account" feature would go through a server route. The deployed app already writes with service-role, so this migration is safe for the currently deployed code. This closes findings 25 and 26 at the database rather than adding checks to policies no client should use. Select policies stay.
- The repository gets one `persistBracket(payload)` method calling the RPC; the old per-row insert methods and `mapTournamentToRows`' per-row output are replaced (the mapper can be reused to build the payload).
- Regenerate `types/database.ts`; add the RPC to the model drift test.

### Browser changes

- `PlayTournamentButton` triggers the request (a TanStack `useMutation` hook, following `src/hooks/` conventions) instead of only flipping the phase flag; the phase advances when results arrive.
- `PlayPlayinGames` / `PlayTournamentGames` dispatch server results instead of calling `playGame`. Keep the current reveal chain; slowing it is future work.
- `playerScore` is set from the server's numbers. The browser may still use `scoreRound` locally to mark picks right or wrong on screen, but the displayed total is the server's.

## 9b: regular season and Selection Sunday on the server

### Flow

1. Starting a game posts to a new endpoint (e.g. `POST /api/season`, origin-checked, rate-limited). The server loads team stats, builds the schedule (`createSeasonSchedule`), plays every regular-season game, runs Selection Sunday (`selectTournamentField`) and seeds the field.
2. The response carries the schedule, every game result in play order, the field and seeding, and a **signed field token**.
3. The browser replays the season one game at a time into the existing Redux actions (`addRegularSeasonGameResult`) with the current pacing, so the standings still rise and fall week by week. Selection Sunday shows the server's field.
4. The tournament request (9a) sends the token back. The server verifies it and rejects a field that was changed. This replaces 9a's structural field check.

### Signed field token

- HMAC-SHA256 over a canonical encoding of `yearId`, the field and an issued-at time, with a new server-only secret `GAME_SIGNING_SECRET` (Vercel env; document in `CLAUDE.md` Environment). Stateless, so nothing is stored per in-progress game (free-plan friendly).
- Reusing a token to play several tournaments on the same field is allowed. Each play is a new bracket with fresh random results.
- Expiry: generous (24 hours) so a slow player is never rejected; builder may adjust with reason.

### Load and size

About 5,000 simulated games per new game. Measure server time on a production build; the budget is under 2 s on Vercel. The response is a few hundred KB before compression; send compact results (team indexes or short keys rather than repeated objects if it helps). Team stats (one Firebase document per year) may be cached in module memory per year.

## Crash handling (both PRs)

- A failed tournament or season request is a crash: report it through `reportCrash` (Sentry) and show `CrashScreen`. Errors from promises are not caught by error boundaries automatically, so route them there on purpose (e.g. TanStack's `throwOnError`, which rethrows during render into `GameErrorBoundary`).
- New `CrashScreen` copy: keep the heading "Something went wrong", add a line that a crash report was sent to the developers, add humor. Chosen by the owner: **"Turnover! A crash report is already on the coach's desk."** (replaces "Sorry about that. We've been notified and will look into it."). Ships in 9a-2.
- Note: with no Sentry DSN (dev, CI, e2e) the report is not actually sent; the copy is written for production.
- Finding 43 is closed by the crash screen, not a toast. `e2e/save-failure.spec.ts` changes from "silent" to "shows the crash screen", and its console allowlist entry goes.

## Testing (TDD, per CLAUDE.md)

- **Game engine rules (`.claude/rules/game-engine.md`).** Moving the tournament drivers (9a) and the season and selection drivers (9b) out of components is a draw-order change. For each: first a commit that only moves the logic, in which fixed-contract tests and statistical checks pass **unchanged**; regenerate only `tests/game/draworder` pins with `-u`; say so in the PR. `tests/game/helpers/runGame.ts` / `fullRun.ts` switch to calling the pure functions.
- **Unit:** `simulateTournament` (fixed contract on a hand-built field: play-in swap, advancement, scoring with an injected points table); request validation (every rejection case); 9b token sign/verify (tampered field, wrong year, expired, wrong secret).
- **Integration:** the route with the use case mocked: session user is used and body identity is ignored; 400s; crash path returns `handleApiError` shape.
- **pgTAP (write first):** `persist_bracket` saves all rows and the score; a bad row rolls back everything (no bracket left); execute denied to `anon`/`authenticated`; client insert/update/delete on `user_brackets`/`user_picks` denied; backfill sets `bracket_id` from picks; the scoring-rules-year check.
- **E2E:** the fake backend implements the new endpoints (it may import the pure engine functions to produce real-looking results); full-game specs still pass at every viewport; `save-failure` becomes the crash-screen spec.

## Docs to update in the same PRs

`docs/DIAGNOSIS.md` (findings 1, 3, 5, 6 wording, 25, 26 wording, 31, 32, 43, 54 marked fixed; step 9 row), `CLAUDE.md` ("Persisting a bracket" section, new env var in 9b), `.claude/rules/game-engine.md` (the loop now runs on the server; browser only replays), `.claude/rules/database.md` (`persist_bracket`, client write grants removed).

## Decisions made by Claude (owner to check)

- Keep the `/api/bracket/simulation` path with a new contract rather than a new path.
- One request simulates and saves (no separate simulate and save calls).
- Revoke client insert/update on `user_brackets` / `user_picks` instead of adding finding 26's checks to policies (delete revoked too, by the owner's decision).
- Add `tournament_games.bracket_id` (nullable, backfilled from picks and, for play-ins, from save time).
- Save real play-in scores (fixes finding 54).
- Ship 9a as a migration-only PR first (9a-1), then the app code (9a-2).
- Finding 26's "picked team must be in the game" rule replaced by bracket-consistency checks (the original rule would reject valid picks).
- Identity from the session, not the request body.
- Signed token instead of storing in-progress games (9b).

## Left to the builder

Exact request/response shapes, the hook and component wiring, payload compaction, caching of team stats, the token encoding, and the loading-state visuals (reuse existing loading UI).
