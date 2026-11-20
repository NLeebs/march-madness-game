# Step 9b: regular season and Selection Sunday on the server

Date: 2026-11-20. Second half of roadmap step 9. Parent spec: `docs/superpowers/specs/2026-11-13-server-authoritative-game-design.md` (its "9b" section, Why, Goals, Anti-goals and Crash handling still apply; this doc is the buildable detail). 9a (tournament on the server) shipped in PRs #20 and #21.

## Why

The owner wants the leaderboard closed the standard way: anything that affects a saved score is computed by the server. After 9a the server plays and scores the tournament, but it still takes the **field** (which 68 teams, which seeds) from the browser and checks only that it is well-formed (68 distinct real teams). A player could post a field they made up. 9b has the server play the season and pick the field, and hand the browser a signed token so the tournament request can only use a field the server produced.

## Goals

- `POST /api/season` plays the whole regular season and Selection Sunday on the server and returns the schedule, every result, the selection and a signed field token.
- The tournament request sends the token instead of the field; the server reads the field (and year) from the verified token.
- The browser replays the season exactly as it looks today and shows the server's Selection Sunday.
- One PR, no database change.

## Non-goals

- Slowing the season reveal (today all 30 weeks land within about half a second, see Facts). Keeping the current look; a slower reveal is a later UI change.
- Storing seasons or in-progress games anywhere.
- Moving team stats off Firebase; component decomposition; the 9a leftovers (`NEXT_PUBLIC_APP_MODE` cleanup, duplicated round-name maps, auth-outage crash).

## Anti-goals (failure even if it works)

- Any change to how the game plays: schedule rules, win odds, records, selection, seeding. Characterization tests prove it.
- The tournament endpoint accepting a field it did not sign, or a token for a different year than the one it plays.
- The signing secret reaching the browser (no `NEXT_PUBLIC_` prefix, never imported from client code).
- A season or token failure the player never hears about: it goes to the crash screen and Sentry, like 9a.

## Facts this rests on (checked 2026-11-20 on `main` at f3fed19)

- **Where the season runs today:**
  - `StartScreen` loads team stats and fills `teamStats`, `conferenceArrays`, `teamSchedule.teamArray` (conference keys, then team keys, in `Object.keys` order) and zeroed `regularSeasonRecords.records`.
  - `SeasonSchedule` (rendered by `App`) calls `createSeasonSchedule(teamStats, teamArray)` as soon as `teamArray` is filled, i.e. on the start screen, before Start is pressed.
  - `PlayRegularSeasonGames` plays each week's games with `playGame` and dispatches `addRegularSeasonGameResult` per game and `addWeekPlayedToTotal` per week; at 30 weeks it activates Selection Sunday.
  - `SelectionSunday` calls `selectTournamentField(records, conferenceArrays)` and dispatches `addConferenceChampion` (each champion), `setPlayinTeams` (16 seeds, then 11 seeds), `addTournamentTeams(field)` and `setTournamentSeeds()`.
- **Pacing:** `PlayRegularSeasonGames` starts every week's `delay(TIMER_PER_REGULAR_SEASON_GAME)` (0.5 s) at the same moment, so all 30 weeks play at about 0.5 s. The standings do not visibly rise week by week today.
- **Records** are computed in the reducer `addRegularSeasonGameResult` (win/loss plus `tournamentSelectionScore += NUMBER_OF_TEAMS - opponentRPI + POINTS_PER_WIN`). Selection needs them, so the server must compute the same thing.
- `createSeasonSchedule`, `playGame` and `selectTournamentField` are pure with an injectable `rng` where they draw (selection does not draw).
- Records are also read for display by `ConferenceGroups` (sort by wins) and `TeamBar` (W-L and the champion trophy).
- 9a's tournament use case (`application/useCases/tournament/PlayTournament.ts`) takes `{ yearId, field, picks, userId, anonUserId }`, checks the field for duplicates and size, loads team stats, teams, rounds, points and the year's scoring rules (`null` rules = unknown year, 400), then simulates and saves.
- About 362 teams × 30 games / 2 ≈ 5,400 games per season.

## Approaches considered

1. **Signed field token (chosen; decided in the parent spec).** Server plays the season, signs `{ yearId, field, issuedAt }` with HMAC-SHA256; the tournament request returns the token. Stateless, nothing stored, free-plan friendly.
2. **Seeded re-simulation.** Server returns an RNG seed; the tournament request sends it back and the server replays the whole season to rebuild the field. No secret, but doubles the server work per game, and any deploy that changes draw order between season and tournament breaks in-progress games.
3. **Store the season server-side.** A row per in-progress game. Needs a table, cleanup and writes for abandoned games; against the free-plan goal.

## Design

### Pure season simulation (`src/functions/regularSeason/`)

- **`applySeasonGameResult(records, gameResult)`**: the record update now inside `addRegularSeasonGameResult`, extracted so the reducer and the server share it. The reducer calls it (Immer draft), so the slice behaves identically.
- **`simulateSeason(teamStats, rng = Math.random)`** returns `{ schedule, weeks, records, selection }`:
  - builds `teamArray` and `conferenceArrays` in the same order the slices do today;
  - `createSeasonSchedule(teamStats, teamArray, rng)`;
  - plays games week 1 → 30, each week's games in schedule order (as `PlayRegularSeasonGames` does), with `playGame(..., rng)`; applies each result with `applySeasonGameResult` starting from zeroed records;
  - `selectTournamentField(records, conferenceArrays)`.
- Draw order: today the schedule is drawn on the start screen and the games after Start, from one `Math.random` stream; `simulateSeason` draws schedule then games in that same order. Follow `.claude/rules/game-engine.md`: first a commit that only moves the logic with fixed-contract and statistical tests unchanged; regenerate only `tests/game/draworder` pins with `-u` in a separate commit if they change, and say so in the PR. `tests/game/helpers/runGame.ts` / `fullRun.ts` switch to the pure function.

### Field token (`utils/api/fieldToken.ts`, server only)

- `signFieldToken({ yearId, field }, now?)` and `verifyFieldToken(token, now?)` → `{ yearId, field, issuedAt }`.
- Format: `base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload part))`, payload `{ v: 1, yearId, field, iat }` where `field` is 9a's `TournamentField` shape (`tournamentTeams`: 60, `playinTeams.elevenSeeds`/`sixteenSeeds`: 4 each).
- Secret from `GAME_SIGNING_SECRET`; missing or shorter than 32 characters throws a plain `Error` (500, reported to Sentry), never a 400.
- Verify with `crypto.timingSafeEqual`; reject malformed, bad signature, wrong version, `iat` more than 5 minutes in the future, or older than **24 hours**. Rejections are `ValidationError` (400) with one generic message ("The tournament field is invalid or expired"), so the crash report says why without detailing which check failed beyond the server log.
- Reusing a token for several tournaments is allowed (each play is a new bracket).

### `POST /api/season`

- Route `app/api/season/route.ts` with the same middleware as the tournament route: POST only, JSON content type, origin check, `rateLimit(60, 60000)`.
- Body (strict zod): `{ yearId: uuid }`.
- Use case `application/useCases/season/PlaySeason.ts`: unknown year → `ValidationError` 400 (same scoring-rules lookup 9a uses); loads team stats with `getTeamStatisticsByYearId`; `simulateSeason`; signs the token from `selection` (`tournamentTeams = selection.field`, play-ins from `selection.elevenSeedPlayins` / `sixteenSeedPlayins`).
- Response (200): `{ yearId, schedule, weeks, selection, fieldToken }`, compact: a `teams` index table, and each game as team indexes plus scores, grouped by week. Exact encoding is the builder's call; the browser expands each game back to the `GameResult` `addRegularSeasonGameResult` takes (RPIs included, from the response or the browser's own team stats, builder's call; either way the replayed records must equal the server's).
- Team stats may be cached per year in module memory with a short TTL (a few minutes), since the Firebase document changes only when stats are re-scraped. Builder's call.

### Tournament request (changes 9a)

- `SimulationRequestSchema` becomes `{ fieldToken: string, picks, anonUserId? }` (strict). `yearId` and `field` leave the body; both come from the verified token.
- `playTournament` takes `{ fieldToken, picks, userId, anonUserId }`, verifies first, then runs as today. The 9a duplicate/size checks on the field may stay as cheap defence; the team-exists lookups stay because saving needs team ids.
- Hard cutover (owner approved 2026-11-20): no tokenless fallback. A tab open during the deploy sends the old body, gets a 400, and shows the crash screen once; a reload fixes it.

### Browser

- **Start:** pressing Start fires `usePlaySeason` (`useMutation`, `throwOnError`) in parallel with the existing transition. The response goes into the store (e.g. a `season` field on `regularSeasonRecords`, plus `fieldToken` on `tournament`). The start screen keeps loading team stats for display as today.
- **Replay:** `PlayRegularSeasonGames` replays the server's weeks with exactly today's timer structure (every week's 0.5 s delay started together), dispatching the same actions in the same order. It waits for the response if it is not back yet; teams sit at 0-0 meanwhile (no new loading UI).
- **Schedule:** `SeasonSchedule` is deleted; the schedule comes from the response (`setSeasonSchedule`) or `teamSchedules` goes if nothing else reads it (builder checks).
- **Selection Sunday:** dispatches the server's selection with today's actions and order; no `selectTournamentField` in the browser.
- **Tournament:** `PlayTournamentButton` / `playTournamentPost` send `fieldToken` instead of `yearId` and `field`.
- **Failure:** a failed season request throws into `GameErrorBoundary` (crash screen + Sentry) with the server's reason in the message, as 9a's `playTournamentPost` does.
- Restart and year change start a fresh season request; the old token is dropped with the rest of the state.

### Load

Measure `POST /api/season` on a production build (`npm run build && npm start`): budget under 2 s server time, response size reported in the PR (before and after gzip). Over budget → profile before changing the encoding.

## Testing (TDD)

- **Engine:** move-only commit with fixed-contract and statistical tests passing unchanged; draw-order pins regenerated separately if needed.
- **Unit:** `applySeasonGameResult` (win, loss, selection score); `simulateSeason` fixed contract on a small built league (schedule, records equal a manual fold, selection equals `selectTournamentField` on those records); token sign/verify (round trip, tampered payload, tampered signature, wrong secret, expired, future `iat`, malformed, wrong version, missing/short secret = plain Error); season schema; updated simulation schema; `PlaySeason` (unknown year 400, token carries the selection); `playTournament` with a token (bad token 400 before any load; field/year from token).
- **Integration:** `/api/season` route (middleware, 400s, `handleApiError` shape); `/api/bracket/simulation` with the new body.
- **Browser:** replay dispatches the same actions as the old driver for the same results; Selection Sunday dispatch order; `PlayTournamentButton` sends the token.
- **E2E:** the fake backend implements `/api/season` with the real `simulateSeason` and the real signer (test secret set in the Playwright process), and the tournament fake verifies the token with the real verifier; full-game specs pass at every viewport; a season-failure spec shows the crash screen.

## Rollout

- **Owner action before merge:** add `GAME_SIGNING_SECRET` (random, at least 32 characters, e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`) to Vercel **Production and Preview**. Without it every new game crashes. Done by the owner 2026-11-20.
- **Local dev:** the build task that adds the season endpoint generates a separate random secret into `.env.local` (gitignored). Each environment has its own secret; e2e uses a fixed test value.
- Rotating the secret invalidates tokens in flight (players mid-game see the crash screen once).
- No migration, so merge order with the database is not a concern.

## Docs to update in the same PR

`CLAUDE.md` (Environment: `GAME_SIGNING_SECRET`; "Persisting a bracket" and "Two kinds of state": season from the server, token flow), `.claude/rules/game-engine.md` (season and selection run on the server; browser replays), `.claude/rules/e2e.md` (season fake, token), `docs/DIAGNOSIS.md` (finding 1 fully fixed; step 9 row done), parent spec's 9b section pointing here.

## Decisions made by Claude (owner to check)

- The token carries the field and year; the tournament body drops both (nothing to compare).
- Hard cutover, no tokenless fallback (owner approved).
- Generic 400 message for every token rejection.
- 5-minute allowance for clock skew on `iat`.
- Season fired at Start click, in parallel with the transition; no new loading UI.

## Left to the builder

Exact response encoding, where the season result lives in the store, whether `teamSchedules` survives, the team-stats cache, and file names within the layers above.
