# Game-Logic Extraction (Step 8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the game rules out of Redux reducers and duplicated code into pure, typed functions in `src/functions/`, with no gameplay change, as three PRs (8a, 8b, 8c).

**Architecture:**
- **8a** merges `playGame`'s mirrored favored/underdog possession code into one routine that takes "offense" and "defense" sides.
- **8b** dispatches the schedule as a single action, groups conferences once, and adds input validation to `selectTournamentField`.
- **8c** adds a `ROUND_CONFIG` table, pure bracket/picks functions and `scoreRound`. The tournament reducers become thin assignments.
- The Redux state shape never changes.

**Tech Stack:** TypeScript, Redux Toolkit 1.x (Immer), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-game-logic-extraction-design.md`. Read it first. Also read `.claude/rules/game-engine.md` and `.claude/rules/e2e.md`.

## Global Constraints

- No gameplay change.
  - Fixed-contract **expected values** and statistical checks never change.
  - Draw-order pins change only via the procedure in `.claude/rules/game-engine.md`: a separate commit, `npx vitest run -u tests/game/draworder` only, and a note in the PR.
- No change to the Redux state shape. `tournamentState` is POSTed to `/api/bracket/simulation`, and e2e reads the store.
- Tests may change *how* they call code: action names, payloads, or calling a pure function. They may not change *what* they expect. Keep at least one reducer-level test per reducer.
- Pinned oddities stay: findings 33, 35, 36, 37, 38. `setTournamentSeeds` keeps appending (finding 38). `setPick` with empty `team` but non-empty `opponent` still cascades (finding 36).
- Pure functions:
  - never mutate their inputs;
  - never read the store;
  - never call `Math.random`;
  - never import React, `@/store` or Redux.
  - They return new objects for changed paths and may share unchanged sub-objects. Reducers assign the result. Assigning a new object that contains Immer drafts is fine.
- No new `any`. Use `import type` for type-only imports.
- `ROUND_POINTS` stays importable from both `@/store` and `@/store/tournamentSlice` (used by `e2e/support/scoring.ts` and `tests/unit/e2e/results.test.ts`).
- Gate before each PR:
  - `npx vitest run` (with `tests/game` under about 40 s)
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run e2e`
- No docs-only PRs. Each PR updates `docs/DIAGNOSIS.md` and, where affected, `.claude/rules/game-engine.md`. The spec and this plan are committed in the 8a PR.
- Branch each PR off an up-to-date `main` after the previous one merges. Use conventional commits, each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Out-of-order result dispatch into `eastWest`/`southMidwest`/`championship`.** Advancement must keep *push* semantics, so the slot a winner lands in is the order of dispatch, exactly as today. Do not switch to explicit slot indexes. That would change behavior for any caller that dispatches in another order. The test goes in Task 7.
2. **Frozen inputs.** Every new pure function must work on deep-frozen input. That proves it never mutates, and it is how Immer hands over finalized state. The tests go in Tasks 6-9.
3. **Numeric seeds.** `createMatchupsFromSeededArr` stores numbers in `seed` even though `TournamentTeam.seed` is typed `string`, and the existing tests expect numbers (`seed: 11`). The new functions must pass seeds through untouched. Do not fix the type in this step. Existing tests cover this; leave it alone.
4. **Server-importable scoring.** `scoreRound.ts` must have no runtime imports, so step 9 can import it on the server without pulling in Firebase via the `@/src/functions` barrel. The test goes in Task 9.
5. **Schedule order within a week.** `setSeasonSchedule` must append each game to its week in input order, even when weeks interleave in the input. The test goes in Task 3.

---

# PR 8a: `playGame` - one possession routine

Branch: `refactor/step8a-playgame` off `main`.

### Task 1: Collapse `playGame`'s favored/underdog code

This is a pure refactor under existing characterization tests (`tests/game/playGame*.test.ts`, `tests/game/playGame.stats.test.ts`, `tests/game/draworder/playGame.draworder.test.ts`, the full-run pins). Those tests are the safety net, so no new test is written first.

**Files:**
- Modify: `src/functions/playGame.ts:148-402` (the game-time section only; lines 1-146 stay byte-identical)
- Add (with this PR): `docs/superpowers/specs/2026-11-12-game-logic-extraction-design.md`, `docs/superpowers/plans/2026-11-12-game-logic-extraction.md`
- Modify: `docs/DIAGNOSIS.md`, `.claude/rules/game-engine.md`

**Interfaces:**
- Produces: `playGame(team1Stats: TeamStats, team2Stats: TeamStats, rng?: () => number): GameResult`, unchanged. The possession routine stays module-private.

- [ ] **Step 1: Branch and baseline**

Run `git checkout main && git pull && git checkout -b refactor/step8a-playgame`, then `npx vitest run tests/game`.
Expected: all pass. Note the wall time.

- [ ] **Step 2: Introduce a module-private side type and possession routine in `src/functions/playGame.ts`**

```ts
interface Side {
  turnoverRate: number;          // was team<X>TurnoverRate
  twoPointAttemptRatio: number;
  causeFoulPercentage: number;
  twoPointPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
  reboundPercentage: number;     // this side's rebound % when DEFENDING a miss (was team<X>ReboundPercentage)
  score: number;
  fouls: number;                 // fouls committed by this side
}
type PossessionOutcome = "switch" | "keep" | "replay"; // replay = floor foul: poss -= 1, same team again
function playPossession(offense: Side, defense: Side, rng: () => number): PossessionOutcome
function shootFreeThrows(shooter: Side, numberOfShots: number, rng: () => number): boolean // returns missedLastFT
```

Build `favored: Side` and `underdog: Side` from the existing computed constants:
- `favored.reboundPercentage = teamFavoredReboundPercentage`;
- `underdog.reboundPercentage = teamUnderdogReboundPercentage`.

`playPossession` must call `rng()` in exactly the order of the current favored branch (lines 197-289):
- substitute `offense` for "favored" and `defense` for "underdog";
- e.g. foul -> `defense.fouls++`, bonus checks on `defense.fouls`, miss -> `defense.reboundPercentage >= rng()` gives "switch", otherwise "keep".

The main loop becomes:

```ts
const outcome = favoredHasPossession
  ? playPossession(favored, underdog, rng)
  : playPossession(underdog, favored, rng);
if (outcome === "replay") poss -= 1;
else if (outcome === "switch") favoredHasPossession = !favoredHasPossession;
```

- Halftime resets `favored.fouls` and `underdog.fouls`.
- The buzzer-beater uses `offense.threePointPercentage`, `score += 1` and switch.
- Return `favored.score` / `underdog.score` in the unchanged `GameResult`.

- [ ] **Step 3: Run the game tests without `-u`**

Run: `npx vitest run tests/game`
Expected: all pass, **including `tests/game/draworder` with no snapshot changes**. If a draw-order pin fails, first diff against the old branch logic and look for a draw-order slip. Only if the order change is intended and the fixed-contract and stats tests still pass unchanged, follow the regeneration procedure in a separate commit.

- [ ] **Step 4: Update docs**

- `docs/DIAGNOSIS.md`:
  - finding 8: append "**Fixed in step 8a:** favored/underdog code collapsed into one possession routine; draw order unchanged."
  - roadmap row 8: note "8a done".
  - finding 45: change "*Fix in step 8 or 10 ...*" to "*Fix in step 10.*" and add it to roadmap row 10's notes.
- `.claude/rules/game-engine.md`: in "Regenerating draw-order pins", replace the example "collapsing `playGame`'s favored/underdog code" with "moving the tournament driver out of components".

- [ ] **Step 5: Commit**

```bash
git add src/functions/playGame.ts docs/ .claude/rules/game-engine.md
git commit -m "refactor(game): collapse playGame favored/underdog possessions into one routine"
```

- [ ] **Step 6: Gate and PR**

Run the full gate (Global Constraints). Then use superpowers:finishing-a-development-branch. The PR body says: "draw order unchanged", "spec + plan for step 8 included".

---

# PR 8b: Season schedule and Selection Sunday

Branch: `refactor/step8b-season` off `main` (after 8a merges).

### Task 2: Group teams by conference once (finding 42)

This is a pure refactor. `tests/unit/functions/createSeasonSchedule.test.ts`, `tests/game/seasonSchedule.test.tsx` and `tests/game/draworder/seasonSchedule.draworder.test.tsx` guard it.

**Files:**
- Modify: `src/functions/regularSeason/createSeasonSchedule.ts:40-55`

- [ ] **Step 1: Build `teamsByConference: Map<string, TeamSchedule[]>` once, before the week loops**

Keep `teamArray` order within each conference. In `scheduleConferenceGames`, iterate `Object.keys(teamStats)` as today. For each conference, pass a **copy** (`[...(teamsByConference.get(conf) ?? [])]`) to `randomTeamSchedule`, because it consumes its array.

- [ ] **Step 2: Run** `npx vitest run tests/unit/functions/createSeasonSchedule.test.ts tests/game/seasonSchedule.test.tsx tests/game/draworder/seasonSchedule.draworder.test.tsx`

Expected: PASS with no snapshot changes.

- [ ] **Step 3: Commit** `refactor(schedule): group teams by conference once per season`

### Task 3: `setSeasonSchedule` replaces ~5,400 dispatches (finding 40)

**Files:**
- Modify: `store/teamScheduleSlice.ts` (add `setSeasonSchedule`, remove `addGameToTeamSchedule` and `AddGameToTeamSchedulePayload`, replace `any` in `TeamScheduleConfigPayload` with `ConferenceMap` from `@/models`)
- Modify: `src/components/RegularSeason/SeasonSchedule.tsx`
- Test: `tests/unit/store/teamScheduleSlice.test.ts` (create), `tests/game/seasonSchedule.test.tsx`

**Interfaces:**
- Consumes: `ScheduledGame` from `src/functions/regularSeason/createSeasonSchedule.ts`
- Produces: `teamScheduleActions.setSeasonSchedule(games: ScheduledGame[])`

- [ ] **Step 1: Write failing tests**

`tests/unit/store/teamScheduleSlice.test.ts`:
- `it("appends each game to its week in input order, even when weeks interleave")`:
  1. Configure two conferences with `teamScheduleConfig`.
  2. Dispatch `setSeasonSchedule([g(week1,A,B), g(week2,A,C), g(week1,C,D)])`.
  3. Expect `teamSchedules.week1` toEqual `[[A,B],[C,D]]`, `week2` toEqual `[[A,C]]`, and every other week `[]`.
- `it("appends to games already in a week")`: preload `week1: [[X,Y]]`, then expect `[[X,Y],[A,B]]`.

`tests/game/seasonSchedule.test.tsx`:
- `it("dispatches the whole schedule as one setSeasonSchedule action")`: use `recordActions()` and expect exactly one action of type `teamSchedule/setSeasonSchedule` and none of type `teamSchedule/addGameToTeamSchedule`.

- [ ] **Step 2: Run them and confirm they fail** (`setSeasonSchedule` is not a function / the action count is wrong)

- [ ] **Step 3: Implement `setSeasonSchedule(state, action: PayloadAction<ScheduledGame[]>)`**

It pushes each `matchup` onto `state.teamSchedules[weekNumber]` in order. `SeasonSchedule.tsx` dispatches it once with `createSeasonSchedule(teamStats, teamArray)`.

- [ ] **Step 4: Run** `npx vitest run tests/unit/store tests/game`. Expected: PASS, no snapshot changes.

- [ ] **Step 5: Update `.claude/rules/game-engine.md`**

The `createFastStore` bullet says dev checks make "5,400-dispatch seasons" slow. Reword it to say season play (one `addRegularSeasonGameResult` per game) is still slow, and keep the helper.

- [ ] **Step 6: Commit** `refactor(schedule): set the season schedule with one action`

### Task 4: `selectTournamentField` validates its inputs (findings 34, 39)

**Files:**
- Modify: `src/functions/regularSeason/selectTournamentField.ts`
- Test: `tests/unit/functions/selectTournamentField.test.ts`

- [ ] **Step 1: Write failing tests** (base data: `buildLeague()` + `buildRecords`, as in the existing tests)

```ts
it("throws when a conference has fewer than two teams", () => {
  // conferenceArrays with one conference reduced to a single team
  expect(() => selectTournamentField(records, oneTeamConf)).toThrow(/at least 2 teams/);
});
it("throws when a conference team has no record", () => {
  // delete records[<a team listed in conferenceArrays>]
  expect(() => selectTournamentField(missing, confArrs)).toThrow(/has no regular season record/);
});
it("throws when there are too few non-champions for the at-large spots", () => {
  // records/conferenceArrays trimmed so non-champions < NUMBER_OF_AT_LARGE_TEAMS
  expect(() => selectTournamentField(small, smallConfArrs)).toThrow(/at-large/);
});
```

- [ ] **Step 2: Run them and confirm they fail** (today they crash with TypeErrors or return `undefined` teams, so they don't throw the expected messages)

- [ ] **Step 3: Add a `validateInputs(records, conferenceArrays)` at the top of `selectTournamentField`**

Run the checks in this order and throw `Error` with these messages:
1. `` `Conference "${conf}" has ${n} team(s); at least 2 teams are needed to pick a champion` ``
2. `` `Team "${team}" in conference "${conf}" has no regular season record` ``
3. `` `Only ${nonChampions} non-champions for ${NUMBER_OF_AT_LARGE_TEAMS} at-large spots` ``, where `nonChampions = Object.keys(records).length - Object.keys(conferenceArrays).length`

Replace the doc comment's "Assumes ..." sentence with "Throws if ..." for the three cases.

- [ ] **Step 4: Run** `npx vitest run tests/unit/functions/selectTournamentField.test.ts tests/game`. Expected: PASS.

- [ ] **Step 5: Update `docs/DIAGNOSIS.md`**

Mark findings 34, 39, 40 and 42 "**Fixed in step 8b.**" and note "8b done" in roadmap row 8.

- [ ] **Step 6: Commit** `fix(selection): validate selectTournamentField inputs`

- [ ] **Step 7: Gate and PR** via superpowers:finishing-a-development-branch.

---

# PR 8c: Tournament - `ROUND_CONFIG`, pure bracket functions, `scoreRound`

Branch: `refactor/step8c-tournament` off `main` (after 8b merges).

**Decisions locked for this PR (the spec left them to the builder):**
- Scoring is per round. The spec's `scoreBracket` is implemented as `scoreRound`, because the driver needs per-round `selected` flags and a running score. Step 9 can sum over rounds.
- Advancement keeps push semantics (Review Focus 1).
- `PlayTournamentGames.tsx`'s six effects are **not** collapsed. They only switch to the new action. Collapsing them waits for step 10.
- New pure functions live in `src/functions/tournament/` and are exported from its `index.ts`, **except** that `scoreRound.ts` is also imported by path where server-safety matters.
- Tests for the pure functions go in `tests/unit/functions/tournament/`, using a shared `deepFreeze` helper in `tests/unit/functions/tournament/deepFreeze.ts`.

### Task 5: `BracketMatchups` type, `ROUND_CONFIG` and play-in constants

**Files:**
- Create: `types/tournament/BracketMatchups.ts` (export from `types/tournament/index.ts`)
- Create: `src/functions/tournament/roundConfig.ts`
- Modify: `store/tournamentSlice.ts` (`TournamentState extends BracketMatchups`, with fields unchanged)
- Modify: `src/components/Tournament/TournamentMatchup.tsx` (`getNextRoundInfo`, `getChampionStyles` placeholders), `src/components/UI/TeamBar.tsx` (placeholder strings)
- Test: `tests/unit/functions/tournament/roundConfig.test.ts`

**Interfaces:**
- Produces, in `types/tournament/BracketMatchups.ts`:

```ts
export type ScoredRound = Exclude<TournamentRound, "champion">;
export type MatchupsKey =
  | "roundOneMatchups" | "roundTwoMatchups" | "roundSweetSixteenMatchups"
  | "roundEliteEightMatchups" | "roundFinalFourMatchups" | "roundFinalsMatchups";
export type BracketMatchups = { [K in MatchupsKey]: TournamentRoundMatchups } & {
  champion: { [region in TournamentRegion]?: TournamentTeam[][] };
};
export type PlayinSeedType = "elevenSeeds" | "sixteenSeeds";
export type SeedRegion = "west" | "east" | "south" | "midwest";
```

- Produces, in `src/functions/tournament/roundConfig.ts`:

```ts
export interface RoundConfigEntry {
  matchupsKey: MatchupsKey;
  nextMatchupsKey: Exclude<MatchupsKey, "roundOneMatchups"> | "champion";
  nextPicksKey: TournamentPlayerPickRound;
  laterPicksKeys: readonly TournamentPlayerPickRound[];   // cleared by setPick
  advance: Partial<Record<TournamentRegion, { region: TournamentRegion; teamIndex: 0 | 1 }>>; // absent = same region
}
export const SCORED_ROUNDS: readonly ScoredRound[];      // [1, 2, "sweet sixteen", "elite eight", "final four", "finals"]
export const ROUND_CONFIG: Readonly<Record<ScoredRound, RoundConfigEntry>>;
export const SEED_REGIONS: readonly SeedRegion[];        // ["west", "east", "south", "midwest"]
export function nextRegionOf(round: ScoredRound, region: TournamentRegion): TournamentRegion;
export const PLAYIN_PLACEHOLDERS: Readonly<Record<PlayinSeedType, readonly [string, string]>>;
//   elevenSeeds: ["playinGameSeed11Game1", "playinGameSeed11Game2"], sixteenSeeds: ["playinGameSeed16Game1", "playinGameSeed16Game2"]
export const PLAYIN_ROUND_ONE_SLOTS: Readonly<Record<PlayinSeedType, readonly [{ region: SeedRegion; game: number }, { region: SeedRegion; game: number }]>>;
//   elevenSeeds: [{south, 4}, {midwest, 4}], sixteenSeeds: [{west, 0}, {east, 0}]  (team slot is always [1])
export const ALL_PLAYIN_PLACEHOLDERS: readonly string[];  // the four names, for TeamBar / getChampionStyles
```

Values to encode, taken from the current ladders:

| round | matchupsKey | nextMatchupsKey | nextPicksKey | laterPicksKeys | advance |
|---|---|---|---|---|---|
| 1 | roundOneMatchups | roundTwoMatchups | roundTwoPicks | S16, E8, F4, Finals, champion picks | - |
| 2 | roundTwoMatchups | roundSweetSixteenMatchups | roundSweetSixteenPicks | E8, F4, Finals, champion | - |
| sweet sixteen | roundSweetSixteenMatchups | roundEliteEightMatchups | roundEliteEightPicks | F4, Finals, champion | - |
| elite eight | roundEliteEightMatchups | roundFinalFourMatchups | roundFinalFourPicks | Finals, champion | west→eastWest/0, east→eastWest/1, south→southMidwest/0, midwest→southMidwest/1 |
| final four | roundFinalFourMatchups | roundFinalsMatchups | roundFinalsPicks | champion | eastWest→championship/0, southMidwest→championship/1 |
| finals | roundFinalsMatchups | champion | champion | (none) | championship→champion/0 |

- [ ] **Step 1: Write failing tests**

In `roundConfig.test.ts`:
- `it("encodes every round's keys")`: `toEqual` against the table above.
- `it("nextRegionOf maps elite eight, final four and finals regions and leaves earlier rounds alone")`.

In `tests/game/tournamentDrivers.test.tsx` (or a new `getNextRoundInfo` block in `tests/unit/functions/tournament/roundConfig.test.ts`):
- `it("getNextRoundInfo returns the same values as before for every round and region")`. Use explicit expected values for each `advance` key, plus `{ nextRoundRegion: region, teamIndex: index }` for rounds 1, 2, sweet sixteen, `"playin"` and `"champion"`.

- [ ] **Step 2: Run them and confirm they fail** (module not found)

- [ ] **Step 3: Implement** the types and `roundConfig.ts`.
  - Rewrite `getNextRoundInfo` (keep it exported from `TournamentMatchup.tsx`, with the same signature) to read `ROUND_CONFIG[round].advance[region]` when `round` is a `ScoredRound`, else fall back to `{ nextRoundRegion: region, teamIndex: index }`.
  - Replace the placeholder string literals in `TeamBar.tsx` and `getChampionStyles` with `ALL_PLAYIN_PLACEHOLDERS` / `PLAYIN_PLACEHOLDERS`. Do not touch the ladders in `TournamentRound.tsx` / `RoundSelectButton.tsx` (step 10).

- [ ] **Step 4: Run** `npx vitest run tests/unit/functions/tournament tests/game`. Expected: PASS.

- [ ] **Step 5: Commit** `refactor(tournament): add ROUND_CONFIG and play-in constants`

### Task 6: Pure seeding and round-one matchups

**Files:**
- Create: `src/functions/tournament/seedTournament.ts`, `src/functions/tournament/buildRoundOneMatchups.ts`
- Modify: `store/tournamentSlice.ts` (`setTournamentSeeds`, `setRoundOneMatchups`, `addTournamentTeams`, `setPlayinTeams`)
- Test: `tests/unit/functions/tournament/seeding.test.ts`

**Interfaces:**
- Consumes: `SEED_REGIONS`, `PLAYIN_PLACEHOLDERS`, `SeedRegion`, `PlayinSeedType` (Task 5)
- Produces:

```ts
export function seedTournament(tournamentTeams: readonly string[]): Record<SeedRegion, string[]>;
export function buildRoundOneMatchups(
  seeds: Readonly<Record<SeedRegion, readonly string[]>>,
  playinTeams: Readonly<Record<PlayinSeedType, readonly string[]>>
): TournamentRoundMatchups;   // four regions in [0,7,4,3,5,2,6,1] order + playin { elevenSeeds (seed 11), sixteenSeeds (seed 16) }
```

Typed payloads:
- `addTournamentTeams: PayloadAction<string[]>`
- `setPlayinTeams: PayloadAction<{ seed: 11 | 16; team: string }>`

- [ ] **Step 1: Write failing tests**
  - `seedTournament(SIXTY)` gives the same four arrays that `tests/game/tournamentSlice.test.ts` "builds the exact west/east/south/midwest array" expect. Copy those expected arrays.
  - `buildRoundOneMatchups` gives the same orders as the "orders west/east/south/midwest" and "pairs play-in teams" tests.
  - Both work on `deepFreeze`d input.

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Implement** by moving the loop bodies out of the reducers.
  - `setTournamentSeeds` becomes "for each region of `SEED_REGIONS`, `state.tournamentSeeds[region].push(...seeds[region])`". This keeps append semantics (finding 38).
  - `setRoundOneMatchups` assigns each region and `playin` from the result.

- [ ] **Step 4: Run** `npx vitest run tests/unit/functions/tournament tests/game`. Expected: PASS with unchanged expectations.

- [ ] **Step 5: Commit** `refactor(tournament): extract seeding and round-one matchups`

### Task 7: Pure game-result application

**Files:**
- Create: `src/functions/tournament/applyGameResult.ts`
- Modify: `store/tournamentSlice.ts` (`setPlayinGameResults`, `setTournamentGameResults`)
- Test: `tests/unit/functions/tournament/applyGameResult.test.ts`

**Interfaces:**
- Consumes: `ROUND_CONFIG`, `nextRegionOf`, `PLAYIN_ROUND_ONE_SLOTS`, `BracketMatchups` (Task 5); `TournamentGameResult` (`types/tournament/TournamentGameResult.ts`)
- Produces:

```ts
export interface PlayinGameResult {
  seedType: PlayinSeedType; gameIndex: number; winningTeam: string; winningScore: number; losingScore: number;
}
export function applyPlayinResult(roundOne: TournamentRoundMatchups, result: PlayinGameResult): TournamentRoundMatchups;
export function applyGameResult(bracket: BracketMatchups, round: ScoredRound, result: TournamentGameResult): BracketMatchups;
```

Typed payloads:
- `setPlayinGameResults: PayloadAction<PlayinGameResult>`
- `setTournamentGameResults: PayloadAction<{ round: ScoredRound; results: TournamentGameResult }>`

Keep these behaviors:
- `gameIndex === 0` uses the first slot, any other value the second;
- a non-`elevenSeeds` seed type uses the sixteen slots.

- [ ] **Step 1: Write failing tests**
  - The four `setPlayinGameResults` scenarios from `tests/game/tournamentSlice.test.ts`, with the same expected values.
  - `applyGameResult` round 1: winner pushed at `floor(gameIndex/2)` with `{ team, seed }`; winner gets `score = winningScore, win = true`, loser gets `score = losingScore, win = false`.
  - Review Focus 1: `it("fills eastWest in dispatch order: east before west puts east in slot 0")`. Apply an `elite eight` result for `east`, then one for `west`. Expect `roundFinalFourMatchups.eastWest[0]` to be `[east winner, west winner]`.
  - Frozen input: inputs are not mutated.

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Implement.**
  - The reducers become `state.roundOneMatchups = applyPlayinResult(state.roundOneMatchups, action.payload)` and `Object.assign(state, applyGameResult(state, round, results))`.
  - `applyGameResult` returns a new `BracketMatchups` that replaces only `matchupsKey` and `nextMatchupsKey` (shallow-copy the rest).

- [ ] **Step 4: Run** `npx vitest run tests/unit/functions/tournament tests/game`. Expected: PASS, including `tests/game/tournamentSlice.test.ts` with unchanged expectations and all draw-order pins.

- [ ] **Step 5: Commit** `refactor(tournament): extract game-result application`

### Task 8: Pure picks cascade and rename the picks actions

**Files:**
- Create: `src/functions/tournament/picks.ts`
- Modify: `store/tournamentPlayersPicksSlice.ts`, plus the rename at every call site:
  - `src/components/Tournament/PlayPlayinGames.tsx`
  - `src/components/Tournament/TournamentMatchup.tsx`
  - `src/hooks/useRestartTheGame.ts`
  - `tests/game/helpers/runGame.ts`
  - `tests/game/picksAndScoring.test.ts`
- Test: `tests/unit/functions/tournament/picks.test.ts`

**Interfaces:**
- Consumes: `ROUND_CONFIG`, `PLAYIN_PLACEHOLDERS` (Task 5); `Pick`, `PlayInGameWinner`, `TournamentPicks` (`types/tournament/TournamentPicks.ts`, `TournamentPlayinGames.ts`)
- Produces:

```ts
export function applyPick(picks: TournamentPicks, pick: Pick): TournamentPicks;   // write (skipped if team === "") then cascade (if opponent !== "")
export function replacePlayinPlaceholder(picks: TournamentPicks, winner: PlayInGameWinner): TournamentPicks;
// renamed export: tournamentPlayersPicksActions (was tounramentPlayersPicksActions), no alias kept
```

Narrow the `round` of `Pick` to `ScoredRound` in its type if `tsc` allows. If not, cast once inside `applyPick`.

- [ ] **Step 1: Write failing tests**

Port each `setPick` / `replacePlayinPicksWithWinner` scenario in `tests/game/picksAndScoring.test.ts` to call the pure functions, with the same expected values. That includes the finding 36 "current behaviour" case. Add frozen-input tests.

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Implement**, make the reducers `state.picks = applyPick(state.picks, action.payload)` / `replacePlayinPlaceholder(...)`, and rename the actions export at all call sites.

- [ ] **Step 4: Run** `npx vitest run tests/unit/functions/tournament tests/game` and `npx tsc --noEmit`. Expected: PASS. `grep -r tounramentPlayersPicksActions` finds nothing outside `node_modules`.

- [ ] **Step 5: Commit** `refactor(picks): extract the picks cascade and fix the actions name`

### Task 9: `scoreRound` replaces `comparePicksAndGames`

**Files:**
- Create: `src/functions/tournament/scoreRound.ts` (also export from the tournament barrel)
- Modify: `store/tournamentSlice.ts`:
  - remove `ROUND_POINTS` and `comparePicksAndGames`;
  - add `recordRoundScore`;
  - add `export { ROUND_POINTS } from "@/src/functions/tournament/scoreRound";`
- Modify: `src/components/Tournament/PlayTournamentGames.tsx` (six `comparePicksAndGames` dispatches become `recordRoundScore`, with the same payloads)
- Modify: `tests/game/picksAndScoring.test.ts`:
  - its `compare` helper dispatches `recordRoundScore`;
  - rename the describe block to `recordRoundScore`;
  - keep every expectation.
- Test: `tests/unit/functions/tournament/scoreRound.test.ts`

**Interfaces:**
- Produces:

```ts
export type RoundPoints = Readonly<Record<ScoredRound, number>>;
export const ROUND_POINTS: RoundPoints; // { 1: 10, 2: 20, "sweet sixteen": 40, "elite eight": 80, "final four": 160, finals: 320 }
type Slots = Readonly<Record<string, ReadonlyArray<ReadonlyArray<{ team: string }>>>>;
export interface RoundScore { correct: Record<string, boolean[][]>; points: number; }
export function scoreRound(input: {
  round: ScoredRound;
  advanced: Slots;      // the NEXT round's matchups as they stand; only these slots are scored
  picks: Slots;         // the player's picks for that next round
  winningTeams: readonly string[];
  points: RoundPoints;
}): RoundScore;
// tournamentActions.recordRoundScore(PayloadAction<{ round: ScoredRound; winningTeams: string[]; picks: RegionPicks }>)
```

Rule: for every `advanced[region][i][j]`, `correct = winningTeams.includes(picks[region][i][j].team)`, and `points` adds `points[round]` per correct slot. The reducer calls `scoreRound` with `advanced = state[ROUND_CONFIG[round].nextMatchupsKey]` and `ROUND_POINTS`, sets `selected = correct[region][i][j]` on each slot, and adds `points` to `playerScore`.

- [ ] **Step 1: Write failing tests**
  - Port the `comparePicksAndGames` scenarios (per-round points and `selected`, finals 320, wrong pick 0, "walks the next round's matchups" = 0 for empty `advanced`) as `scoreRound` calls with the same numbers.
  - `it("uses the points table it is given")`: `points` with `1: 7` gives 7 per correct pick.
  - Frozen input.
  - Review Focus 4: `it("has no runtime imports")`. Read `src/functions/tournament/scoreRound.ts` with `fs` and expect every line matching `/^import\s/` to match `/^import type\s/`.

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Implement** `scoreRound.ts`, `recordRoundScore` and the driver change. `ROUND_POINTS` re-export keeps `tests/unit/e2e/results.test.ts` and `e2e/support/scoring.ts` working unchanged.

- [ ] **Step 4: Run** `npx vitest run` (the whole suite) and `npx tsc --noEmit`. Expected: PASS, no snapshot changes.

- [ ] **Step 5: Commit** `refactor(scoring): extract scoreRound with an injectable points table`

### Task 10: Docs, gate and PR

**Files:** `docs/DIAGNOSIS.md`, `.claude/rules/game-engine.md`

- [ ] **Step 1: Update `docs/DIAGNOSIS.md`**
  - Mark findings 6 and 7 "**Fixed in step 8c**". Name `scoreRound`, `ROUND_CONFIG` and `src/functions/tournament/`, and note that step 9 imports `scoreRound` by path, not via the `@/src/functions` barrel.
  - Roadmap row 8: Done.
  - Roadmap row 10: add "switch the `TournamentRound.tsx` / `RoundSelectButton.tsx` round ladders to `ROUND_CONFIG`; consider collapsing `PlayTournamentGames`' six effects".

- [ ] **Step 2: Update `.claude/rules/game-engine.md`**
  - Loop items 4-5 now read "seeding and bracket (`src/functions/tournament/`, stored by `tournamentSlice`)" and "picks (`applyPick`, stored by `tournamentPlayersPicksSlice`)".
  - Add a line saying pure tournament functions are tested in `tests/unit/functions/tournament/` with frozen inputs.

- [ ] **Step 3: Run the full gate** (Global Constraints). Expected: all green; e2e passes with no allowlist changes.

- [ ] **Step 4: Commit** `docs: record step 8c in diagnosis and game-engine rules`, then open the PR via superpowers:finishing-a-development-branch.
