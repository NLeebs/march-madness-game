# Step 8: Game-logic extraction - design

Roadmap step 8 in `docs/DIAGNOSIS.md`. Findings addressed: 6, 7, 8 (rest), 34, 39, 40, 42.

## Intent

The big game operations are hard to follow, and their logic is in the wrong places:
- seeding, advancement, the picks cascade and scoring live inside Redux reducers;
- the round and region routing is copied as `if` ladders across reducers and components;
- `playGame` writes every possession rule twice.

This step moves that logic into plain, typed functions in `src/functions/`, so it is easy to maintain, test on its own and secure. The user wants a clean, safe base before exploring gameplay changes to make the game more fun. Those gameplay changes are out of scope here.

It also prepares step 9. There, the server recomputes the bracket score itself instead of trusting the client, using the same scoring function this step creates.

## Goals

- Game rules live in pure, typed functions under `src/functions/`. Each can be tested without a Redux store and called from server code.
- Round/region routing is defined once (`ROUND_CONFIG`) and used everywhere that today computes "next round key / next region / slot" by hand.
- One pure `scoreBracket` function with the per-round points passed in. `comparePicksAndGames` and its hard-coded points go away.
- `playGame` describes a possession once, for whichever team has the ball.
- Every reducer has a typed `PayloadAction`, and reducers are thin: they assign values the pure functions computed.
- Small cleanups we're already in these files for:
  - finding 40: one `setSeasonSchedule` action instead of about 5,400 `addGameToTeamSchedule` dispatches;
  - finding 42: group teams by conference once in `createSeasonSchedule`;
  - findings 34 and 39: `selectTournamentField` validates its inputs and throws.

## Non-goals

- No gameplay change. The same seeds give the same games, brackets, picks behavior and scores.
- No change to the Redux **state shape**. `tournamentState` is POSTed as-is to `/api/bracket/simulation`. The e2e suite reads the store too: `state.tournament.playerScore`, the matchup trees and the `selected` flags. Step 9 owns the request schema.
- No server-side scoring, no reading `tournament_round_scoring` from the database, no API or DB changes (step 9).
- No component decomposition, layout work or finding 41 (step 10).
- Finding 45 (the season resolving at once) moves to step 10, because fixing it changes what the player sees.
- `appState` as a phase enum (finding 10) stays under "Later".
- Pinned oddities 33, 35, 36, 37 and 38 stay as they are, and their `// current behaviour:` tests stay. The new pure functions must reproduce them exactly. In particular:
  - `setPick` still clears the opponent when `team` is empty (finding 36);
  - ties still resolve by key order (finding 37);
  - `setTournamentSeeds` stays non-idempotent (finding 38).

## Anti-goals (failure even if it "works")

- Any fixed-contract **expected value** or statistical check changes. Those only change for a deliberate gameplay change, and this isn't one.
- Logic moved out of a reducer into a component or hook instead of into `src/functions/`.
- A "pure" function that mutates its inputs, reads the store or calls `Math.random` directly.
- New `any`. Type new code as if `strict` were on.

## Constraints

- `.claude/rules/game-engine.md` governs the test changes.
  - Fixed-contract tests and statistical checks keep their expected values.
  - Draw-order pins are regenerated only through the procedure there: a separate commit and `-u` on `tests/game/draworder` only.
- Tests that dispatch reducer actions directly (e.g. `tests/game/picksAndScoring.test.ts`, `tournamentSlice.test.ts`) may change how they call the code, such as new action names, payload shapes or calling the pure function. They may not change what they expect. Where a test moves from the reducer to the pure function, keep at least one reducer-level test so the wiring stays covered. *(My call.)*
- `ROUND_POINTS` is imported from `@/store` / `@/store/tournamentSlice` by `e2e/support/scoring.ts` and `tests/unit/e2e/results.test.ts`. Keep it exported from `@/store` (a re-export is fine) or update those imports in the same PR.
- Gate before each PR: `npx vitest run` (with `tests/game` under about 40 s), `npm run lint`, `npx tsc --noEmit`, and the Playwright suite (`npm run e2e`).
- Each PR rolls its own doc updates in (no docs-only PRs):
  - in `docs/DIAGNOSIS.md`, mark the findings fixed and move finding 45 to step 10 (in the 8a PR);
  - update `.claude/rules/game-engine.md` where its description of the loop or helpers changes.
  - This spec and the plan are committed with the 8a PR.
- TDD per `superpowers:test-driven-development`. Each new pure function gets fixed-contract unit tests written first, under `tests/game/` or `tests/unit/functions/`, with explicit expected values from hand-built inputs.

## Delivery: three PRs, in order

### 8a - `playGame`: one possession routine

Today the favored and underdog branches of the possession loop (`src/functions/playGame.ts` lines 196-385) are mirror images. So are `favoredShootFT` / `underdogShootFT` and the two halves of the buzzer-beater loop.

- Collapse them into a single routine parameterized by "offense" and "defense" sides. Each side carries:
  - its pre-computed rates: turnover, two-point attempt ratio, foul-drawn %, 2P %, 3P %, FT %;
  - the **opponent's** rebound % used after a miss;
  - its score and foul counter.
- The biased-stat derivations (lines 73-146) stay exactly as they are. Their asymmetry ("upper limit" / "sync" / "lower limit", and which side passes `true` to the rebound helper) is gameplay. Only the per-possession code is merged.
- Keep `playGame(team1, team2, rng = Math.random)` and its `GameResult` return value unchanged.
- **Draw order:** both branches currently draw `rng()` in the same sequence, so a faithful collapse should leave the draw-order pins unchanged. That is the target.
  - If the implementation still changes the order or count of draws, follow the regeneration procedure and say so in the PR.
  - Either way, the fixed-contract tests and the `playGame` statistical checks must pass unchanged.
- Builder's choice: whether the possession routine is exported (and unit-tested directly) or stays module-private behind `playGame`'s existing tests.

### 8b - Season schedule and Selection Sunday

- **Finding 40.** Add a typed `teamScheduleSlice.setSeasonSchedule(games: ScheduledGame[])`. It fills `teamSchedules` in the same order the per-game pushes did today.
  - `SeasonSchedule.tsx` dispatches it once.
  - Remove `addGameToTeamSchedule` (nothing else uses it), and type `TeamScheduleConfigPayload` without `any`.
  - The schedule draw-order pin compares the resulting `teamSchedules`, so it must stay byte-identical.
- **Finding 42.** In `createSeasonSchedule`, build the conference -> teams grouping once before the week loop. Each conference keeps `teamArray` order and conferences keep `Object.keys(teamStats)` order, so the draws are identical and the pins hold.
- **Findings 34 and 39.** `selectTournamentField` validates its inputs up front and throws a descriptive `Error` when:
  - a conference has fewer than two teams;
  - a team in `conferenceArrays` has no entry in `records`;
  - there are too few non-champions to fill `NUMBER_OF_AT_LARGE_TEAMS`.

  Write failing tests for each first. Real data never hits these cases, so the UI needs no handling: an uncaught error in this case is acceptable. *(My call.)* Update the "Assumes ..." doc comment.
- Type the remaining reducers in `teamScheduleSlice` and `regularSeasonRecordSlice` that touch this flow, if any are untyped.

### 8c - Tournament: `ROUND_CONFIG`, pure bracket functions, `scoreBracket`

**`ROUND_CONFIG`** lives in `src/functions/tournament/`. It is one typed table keyed by round (`1 | 2 | "sweet sixteen" | "elite eight" | "final four" | "finals"`). For each round it gives:
- the matchup key in `TournamentState`, e.g. `roundOneMatchups`;
- the next round's matchup key, ending at `champion`;
- the players-picks key for the next round, e.g. `roundTwoPicks`;
- the later pick rounds that `setPick` clears;
- how a region maps into the next round's region, e.g. `elite eight`: `west`/`east` -> `eastWest`, `final four` -> `championship`, `finals` -> `champion`.

The play-in placeholder names (`playinGameSeed11Game1`, etc.) and the play-in -> round-one slot mapping (`south[4][1]`, `midwest[4][1]`, `west[0][1]`, `east[0][1]`) also become named constants or a small map next to it.

It replaces the `if` ladders in:
- `setTournamentGameResults`
- `comparePicksAndGames`
- `setPick`
- `replacePlayinPicksWithWinner`
- `setPlayinGameResults`
- `getNextRoundInfo` (`TournamentMatchup.tsx`; keep it exported, because `tests/game/helpers/runGame.ts` uses it)

**Scope of `ROUND_CONFIG` in components.** *(My call.)*
- `TournamentRound.tsx` (displayed round -> matchups and picks key) and `RoundSelectButton.tsx` (round -> picks it checks for completeness) have their own render-layer ladders. Their mapping differs from the next-round one, and they also cover `"playin"` and `"champion"`.
- Those two ladders are replaced in step 10, when the components are decomposed. In 8c, `ROUND_CONFIG` is still designed so they can switch to it cleanly then: include each round's own matchups key, and leave room for `"playin"` and `"champion"` entries.
- The play-in placeholder constants **are** used everywhere in 8c, including `TeamBar.tsx` and `getChampionStyles`. That is a string-for-constant swap with no layout effect.

**Ordering invariants to preserve.**
- Advancement into `eastWest` / `southMidwest` / `championship` currently **pushes** in dispatch order.
  - The drivers iterate regions in object-key order: `west, east, south, midwest`, then `eastWest, southMidwest`.
  - So `west` and `south` land in slot 0 and `east` and `midwest` in slot 1, which matches `getNextRoundInfo`'s `teamIndex`.
- Whether the new code keeps pushing or writes to an explicit slot from `ROUND_CONFIG` is the builder's choice. The resulting state must be identical, including when results are dispatched in that order.

**Pure functions** go in `src/functions/tournament/`, exported through the barrels. Each one takes plain data and returns new data. Reducers call them and assign the result. Immer drafts are fine as long as the function doesn't depend on being given one.
- `seedTournament(tournamentTeams)`: the regional seed lists, including the play-in placeholders. Today this is `setTournamentSeeds`; the reducer still appends, per finding 38.
- `buildRoundOneMatchups(seeds, playinTeams)`: the 1v16, 8v9, 5v12 ... ordering and the play-in matchups.
- `applyPlayinResult(...)` and `applyGameResult(round, result, ...)`: record score and win on the current matchup and place the winner in the next round.
- `applyPick(picks, pick)` and `replacePlayinPlaceholder(picks, winner)`: the picks cascade, including finding 36's behavior.
- `scoreBracket`: below.

Exact names and signatures are the builder's call. The requirement is that each is pure, typed and unit-tested with hand-built inputs.

**`scoreBracket`** replaces the per-round logic of `comparePicksAndGames` with a pure function.
- Inputs are only plain data:
  - the player's picks for the round being scored (the next round's pick slots);
  - the winners of the round;
  - the points table (`Record<round, number>`).
- It returns, for each pick slot, whether the pick was correct (this drives the `selected` flags on the next round's matchups), plus the points earned.
- It must reproduce today's rule exactly: a pick slot is correct if its team is **anywhere** in that round's winners list. It is not a slot-by-slot comparison.
- Builder's choice: per round, or once over the whole bracket. If it covers the whole bracket, the per-round driver still needs per-round results for `selected` and the running `playerScore`.
- The client passes today's `ROUND_POINTS` (10/20/40/80/160/320, unchanged). Step 9 will call the same function on the server with points loaded from `tournament_round_scoring`, after mapping the stored picks and games into its inputs. That mapping is step 9's job, but `scoreBracket`'s input types must not depend on Redux, React or `@/store`.
- `scoreBracket`'s module must not import client-only code, so that server code can import it directly. The `@/src/functions` barrel re-exports `getTeamStatData`, which initialises Firebase, so step 9 will import `scoreBracket` from its own module rather than the barrel.
- `ROUND_POINTS` moves next to `scoreBracket`. `@/store` re-exports it, per Constraints.

**Reducers.**
- `tournamentSlice` and `tournamentPlayersPicksSlice` become thin assignments with typed `PayloadAction`s.
  - Fix the untyped ones: `addTournamentTeams`, `setPlayinTeams`, `setPlayinGameResults`, `setTournamentGameResults`, `comparePicksAndGames`.
- `comparePicksAndGames` becomes a thin reducer, e.g. `applyRoundScore`, that assigns `scoreBracket`'s output.
- `PlayTournamentGames.tsx`'s six near-identical round effects may collapse into one loop over `ROUND_CONFIG`, as long as dispatch order, `appState` transitions and RNG draw order stay identical.
  - That is a small step toward step 10, not a decomposition. Builder's choice.
  - If done, the full-run draw-order pin must not move.
- Rename the misspelled `tounramentPlayersPicksActions` to `tournamentPlayersPicksActions` across all call sites. *(My call; it touches about 4 files.)*

## Left to the builder

- Function names, file layout inside `src/functions/tournament/` and `src/functions/regularSeason/`, and the exact shape of `ROUND_CONFIG`.
- Whether `playGame`'s possession routine is exported.
- Whether `scoreBracket` works per round or on the whole bracket.
- Whether `PlayTournamentGames`'s effects collapse into one loop.
- Commit granularity within each PR, except that a draw-order change, if any, is its own commit.
