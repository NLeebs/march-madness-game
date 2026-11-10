# Game engine characterization tests (roadmap step 6) - design

Status: draft, 2026-11-10. Addresses `docs/DIAGNOSIS.md` findings 8 and 9.

## Intent

The owner is nervous about changing any part of the core game loop: schedule creation, the regular season, the games themselves, Selection Sunday, seeding, running the tournament, and picks/scoring. "Without any of that logic the whole game crashes or doesn't make any sense." None of it is covered by meaningful tests today, and roadmap steps 7, 8 and 10 all refactor it.

The point of this step is a safety net: after it ships, a change that crashes the game or produces nonsense (a team playing itself, records that don't add up, a missing conference champion, a loser advancing, a wrong score) fails a test before it reaches players, and a change that quietly alters results is also noticed.

The owner also wants the selection logic moved out of React components, done safely. Small behaviour-preserving code changes are allowed where they make the tests more solid.

## What exists today (recon, 2026-11-10)

| Step | Where it lives | Randomness |
|---|---|---|
| Schedule creation | `src/components/RegularSeason/SeasonSchedule.tsx` (component; `randomTeamSchedule` pairs teams by random splice; 15 non-conference weeks over all teams, then 15 conference weeks per conference with leftovers paired across conferences; dispatches `teamScheduleActions.addGameToTeamSchedule`) | `Math.random` |
| Regular season | `PlayRegularSeasonGames.tsx` (component; per week, `delay` then `playGame` per matchup, dispatches `addRegularSeasonGameResult`, `addWeekPlayedToTotal`; activates Selection Sunday after 30 weeks) + `store/regularSeasonRecordSlice.ts` (wins/losses, `tournamentSelectionScore += NUMBER_OF_TEAMS - opponentRPI + POINTS_PER_WIN`) | via `playGame` |
| The games | `src/functions/playGame.ts` (412 lines; favored team = lower RPI; possession sim; overtime "buzzer beater" loop) | `Math.random` throughout |
| Selection Sunday | `SelectionSunday.tsx` (component; conference champion = most wins, tie-break by selection score; the 4 lowest-scoring champions -> 16-seed play-ins; top at-large teams by selection score, last 4 -> 11-seed play-ins; dispatches `addConferenceChampion`, `setPlayinTeams`, `addTournamentTeams`, `setTournamentSeeds`) | none |
| Seeding / bracket | `store/tournamentSlice.ts`: `setTournamentSeeds` (S-curve over 4 regions with play-in placeholders), `setRoundOneMatchups` (+ `createMatchupsFromSeededArr`), `setPlayinGameResults`, `setTournamentGameResults` (advance winner, record scores) | none |
| Running the tournament | `PlayPlayinGames.tsx`, `PlayTournamentGames.tsx` (233 lines; one effect per round, sims games, dispatches results and `comparePicksAndGames`, advances `appState`), `Tournament.tsx` (547 lines, layout + dispatches `setRoundOneMatchups`) | via `playGame` |
| Picks and scoring | `store/tournamentPlayersPicksSlice.ts` (`setPick` cascades and clears later-round picks), `tournamentSlice.comparePicksAndGames` (hard-coded 10/20/40/80/160/320, marks `selected`, adds to `playerScore`) | none |

Existing tests near this code are mock-heavy (`src/components/RegularSeason/__tests__/PlayRegularSeasonGames.test.tsx` mocks `playGame`, the constants and `react-redux`) and do not exercise game logic. Fixtures: `src/mockData/mockTeamStats.ts` has only 4 teams. `NUMBER_OF_AT_LARGE_TEAMS` is `68 - numberOfConferences`, where `numberOfConferences` comes from the legacy `src/components/Add-To-Firebase/teamStatURLUtils.ts`. Vitest runs in jsdom with `@testing-library/react` available.

## Approach (agreed with the owner)

Pin first, then move. Three phases, in this order, each leaving the suite green:

1. **Characterize in place.** Tests against today's code, unchanged: reducers called directly; `playGame` with `Math.random` replaced by a seeded sequence (`vi.spyOn(Math, "random")`); `SeasonSchedule`, `SelectionSunday`, `PlayPlayinGames` and `PlayTournamentGames` rendered against a real Redux store (real slices, not mocked `react-redux`), with fake timers for the `delay`s.
2. **Seedable randomness.** `playGame` and the schedule pairing take an optional random source, `rng: () => number = Math.random`. Default behaviour is identical: same calls, same order, same count of draws. Proof: the phase-1 `playGame` pins are re-run passing the same seeded sequence as `rng` instead of stubbing `Math.random`, and must give identical results.
3. **Extract under the net.** Move schedule creation and Selection Sunday's selection logic out of `SeasonSchedule.tsx` and `SelectionSunday.tsx` into plain functions in `src/functions/regularSeason/` (exported through the barrels). The components keep their props, effects and dispatch order, now calling those functions. Phase-1 tests must pass **without edits** across the extraction commits (test files from phase 1 are not modified in phase-3 commits). New unit tests for the extracted functions are added on top.

### What the net promises to later steps (owner's decision, 2026-11-10)

In this step, the random-draw sequence stays identical. Later refactors (step 8 reworking `playGame`, step 10 moving the tournament driver) **may change the order of random draws**, as long as the game behaves the same statistically. So the net has two layers:

- **Fixed contract, never regenerated:** everything that isn't random given its inputs: schedule invariants, record-keeping, Selection Sunday, seeding, round-one pairings, bracket advancement, picks cascade and scoring. These are tested with hand-built or fixed inputs (e.g. constructed season records, fixed game results), not by depending on a seeded run.
- **Draw-order pins, regenerable on purpose:** exact results that depend on the order of random draws (`playGame` outputs for a seeded sequence, the full seeded run's digest). They live in their own clearly named files (e.g. `*.draworder.test.ts` with their snapshots) so they can be regenerated after a draw-order-only refactor without touching anything else.
- **Statistical checks** guard the game's behaviour when draw-order pins are regenerated (see Goal 2).

## Goals

1. **Invariants, checked over many seeds** (e.g. 20 seeded runs; exact count is the builder's call), on a full-size league fixture:
   - Schedule: 30 weeks; every team plays exactly once per week (an odd team count is handled the way the code does today, pinned as-is); no team plays itself; weeks 16-30 pair conference opponents except leftovers; total games = what today's algorithm yields.
   - Regular season: each game produces one winner, no ties; per team wins + losses = games played; league-wide wins = losses = games; selection score only grows on wins by the stated formula.
   - `playGame`: winner's score > loser's; scores are non-negative integers; favored team is the lower RPI; result names match the inputs.
   - Selection Sunday: 68 teams total (64 bracket + 8 play-in); every conference has exactly one champion and every champion is in the field (bracket or 16-seed play-in); no duplicates; at-large picks are the top remaining selection scores; play-in groups have 4 teams each.
   - Seeding: 4 regions x 16 seeds; each seed line holds the expected teams in S-curve order; play-in placeholders sit at 16 (west, east) and 11 (south, midwest); round-one pairings are 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15.
   - Tournament: play-in winners land in the right round-one slots; every game has exactly one winner; only winners advance; each round halves the field; regions merge correctly into eastWest / southMidwest / championship; the champion is the finals winner.
   - Picks/scoring: `setPick` cascade and clearing behave as today; `playerScore` equals the sum of 10/20/40/80/160/320 over correct picks; `selected` flags match.
   - Phase flow: the `appState` flags advance in the same order through a full run.
2. **Statistical checks** on `playGame` and the regular season, over a large seeded sample (seeded, so the result is the same on every run, never flaky): favored-team win rate (overall and by RPI gap band), mean and spread of winning and losing scores and of the margin, overtime rate, and season-level spread of win totals. Expected values and tolerances are measured from today's code and written into the test with a comment saying how they were measured. Tolerances are tight enough that a real gameplay change fails (e.g. a few percentage points on win rate) and loose enough that a pure reordering of draws passes. To show this, the builder checks once that the checks pass under a few different seeds.
3. **Exact pins**, split as above.
   - Fixed contract: exact expected output for selection, seeding, pairings, advancement and scoring from fixed inputs.
   - Draw-order pins: `playGame` results for fixed team pairs and seeded sequences; a full seeded run's schedule, records, field, seeds, every game result and champion (snapshot or compact digest; builder's call).
4. **One full-run test** that drives the whole loop on the full-size fixture with a fixed seed, from schedule through champion and score, using the real slices and real `playGame`.
5. **Seedable `rng`** in `playGame` and schedule pairing (phase 2), defaulting to `Math.random`.
6. **Extraction** of schedule creation and selection logic (phase 3) into `src/functions/regularSeason/`, components reduced to calling them and dispatching in the same order.
7. **Fixture**: a full-size synthetic league builder in `tests/factories/` (360 teams; conference count equal to `numberOfConferences` so `NUMBER_OF_AT_LARGE_TEAMS` matches; plausible `TeamStats` values; deterministic). `src/mockData/` stays as is for dev mode.
8. **Docs in the same PR** (owner: no docs-only PRs): this spec, the plan, `docs/DIAGNOSIS.md` (findings 8/9 updated, roadmap step 6 done), and a path-scoped rule file `.claude/rules/game-engine.md` (paths covering `src/functions/**`, `store/**`, `src/components/RegularSeason/**`, `src/components/Tournament/**`, `tests/factories/league*`), plus its row in the `CLAUDE.md` rule index. The rule file explains how the net works:
   - the seeded `rng`, and where the invariants, statistical checks and both kinds of pins live;
   - fixed-contract pins and statistical expectations change only with a deliberate gameplay change, called out in the PR;
   - the **regeneration procedure** for draw-order pins: only in a commit that changes draw order and nothing else; statistical checks and fixed-contract tests must pass unchanged in that commit; regenerate with the documented command (e.g. `npx vitest run -u <draworder files>`); and say in the PR that the draw order changed and why.

   `CLAUDE.md`'s convention line "test game logic by stubbing `Math.random` or asserting invariants, not exact scores" is updated to point at the rule file.

## Non-goals

- Step 8 work: `ROUND_CONFIG`, a pure `scoreBracket`, typed `PayloadAction`s, collapsing `playGame`'s favored/underdog duplication. Reading scoring rules from the DB.
- Extracting the tournament driver out of `PlayTournamentGames.tsx` / `PlayPlayinGames.tsx` or decomposing `Tournament.tsx` (step 10). They are characterized, not moved.
- Playwright / browser E2E (step 7). Persistence, API and dashboard code.
- Fixing bugs found along the way (see below).
- Rewriting the existing mock-heavy component tests (they may stay alongside).

## Anti-goals (failure even if it compiles)

- Any change in gameplay: results, distribution of results, selection, seeding, scoring, phase order or timing. With the default `rng`, the sequence of random draws must be identical to today's.
- Flaky tests: no unseeded randomness behind an exact assertion, no real timers, no reliance on object-key order that isn't today's.
- Tests that only verify mocks, or exact pins so broad that every harmless refactor requires rewriting them without saying what changed.
- A slow suite: the whole new suite should add seconds, not minutes, to `npx vitest run`.

## Bugs or oddities found while characterizing

Pin today's behaviour (with a test comment naming it as current behaviour) and record it as a new finding in `docs/DIAGNOSIS.md`; do not fix it in this step. *(My call: the owner asked for safe changes; fixing gameplay here would break the "behaviour preserved" proof. A fix becomes its own small change later.)* Known candidates: `PlayRegularSeasonGames` calls `setSeasonPlayed(true)` inside the per-week loop; scoring is hard-coded and ignores `tournament_scoring_rules` (already finding 6).

## Constraints

- TDD per `CLAUDE.md`: phase-1 tests are characterization (they pass against today's code; to prove each one can fail, break the code locally or flip an expected value once and see it go red). Phase 2/3 changes are driven by tests written first.
- `npm run lint`, `npx tsc --noEmit`, `npx vitest run` pass at the end; existing tests stay green. `strict: false` stays; no new `any` in new code.
- Behaviour preservation is shown by phase-1 tests unchanged across phases 2 and 3, and by the `rng` equivalence pin. No draw-order pin is regenerated in this step.
- Simulation randomness in tests comes only from a seeded generator (a small PRNG such as mulberry32 in a test helper is fine; no new dependency needed).

## Left to the builder

- Exact names and signatures of the extracted functions (e.g. `createSeasonSchedule(teamStats, teamArray, rng)` returning week -> matchups; `selectTournamentField(records, conferenceArrays)` returning champions, play-in groups and the sorted field), as long as the components dispatch the same actions in the same order.
- Snapshot vs digest for full-run pins; number of seeds for invariant runs; the PRNG.
- Sample size and exact tolerances for the statistical checks, within the suite's time budget (seconds, not minutes).
- How to drive the full run (render the phase components with fake timers vs. calling the same functions and reducers in the same order as the components) — but the component-driven flow must be covered at least once, since the tournament driver logic lives in components.
- File layout under `tests/` (e.g. `tests/unit/game/`, `tests/integration/game/`), following existing conventions.
