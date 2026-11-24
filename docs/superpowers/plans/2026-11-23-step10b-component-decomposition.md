# Step 10b: Tournament Component Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the layout and round-name `if` ladders in `Tournament.tsx`, `TournamentRound.tsx` and `RoundSelectButton.tsx` with pure, unit-tested functions and one `<BracketColumn>` component, without changing a single rendered class, animation target or DOM position.

**Architecture:** First pin today's rendered output: a render characterization test with framer-motion mocked so every `animate` target shows in the DOM. Then extract one ladder at a time into `src/functions/tournament/layout/`, writing characterization unit tests first, and switch the component over. The render snapshot is never updated in this PR. If it changes, the refactor changed behavior.

**Tech Stack:** React 18, Redux Toolkit, framer-motion, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-step10-component-decomposition-design.md` (section "PR 10b").

## Global Constraints

- Branch `refactor/step10b-component-decomposition` (already created off `main` at 179f002). Conventional commit prefixes (`test:`, `refactor:`, `docs:`). End each commit with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Behavior-preserving only. No visible change at any width: spacing, column positions, animation targets, breakpoints, DOM order and class strings stay the same. Class strings may differ only in whitespace.
- The render snapshot written in Task 1 must not change in Tasks 2-5. Never run vitest with `-u` in this PR.
- Every `TOURNAMENT_BREAK_POINT` comparison keeps its operator (`>` for wide, `<` for the banner and the narrow play-in). 10c changes these, not 10b. No `isWideBracket` helper in 10b.
- Pure functions go in `src/functions/tournament/layout/` with a `layout/index.ts` barrel, re-exported from `src/functions/tournament/index.ts`. They import constants from `@/src/constants`, types from `@/types`, and nothing at runtime from `@/store`.
- `screenWidth` parameters are typed `number`. Components pass the store value as they do today; the bracket never renders before `App.tsx` dispatches `screenSize`.
- No new `any`. Type new code as if `strict` were on.
- Run `npx vitest run` (never watch mode).

## Review Focus

1. **`selectedRound === "champion"`** (allowed by the type; no button sets it). Today, below 769px, every column position is `undefined`, the elite eight and final four columns stay expanded, and `getRoundSpacing` returns all `undefined`. Pinned in Tasks 1, 2 and 4.
2. **Exact boundary widths** (768/769, 1024/1025, 1400/1401, 1700/1701, 2040/2041, 2349/2350/2351), including position 4's strict `< 2040` against the `<= 2040` used elsewhere. Pinned in Tasks 1, 2, 4 and 5.
3. **Bottom round-1 column's `overflow-hidden`**, where every other column has `overflow-x-clip`. A generic column would "fix" this by accident. Pinned in Task 1, and carried as a per-column value in Task 3.
4. **The wide play-in `TournamentRound` without `roundUIPosition`**: its spacing animate values are all `undefined`. Pinned in Tasks 1 and 4.
5. **"Default" round buttons animate only `width`**, while "shrink" also sets `color` and `fontSize`. So a shrunk button that comes back keeps its shrunk colour and size. Keep this. Pinned in Tasks 1 and 5.

---

### Task 1: Render characterization snapshot

Pin what the three components render today, before any change.

**Files:**
- Create: `tests/game/helpers/fieldStore.ts`, moved out of `tests/game/tournamentDrivers.test.tsx`'s `fieldStore` (the test imports it from there afterwards)
- Create: `tests/unit/components/Tournament/bracketRender.test.tsx` (+ its `__snapshots__` file, written by the first run)

**Interfaces:**
- Produces: `fieldStore(variant: number): { store: AppStore; actions: AnyAction[] }` in `tests/game/helpers/fieldStore.ts`. Behavior is unchanged.
- Produces: the snapshot file, which Tasks 2-5 run unchanged.

- [ ] **Step 1: Move `fieldStore` to the helper**

Move the function and the league/champions setup it needs, unchanged. Run `npx vitest run tests/game/tournamentDrivers.test.tsx`. Expected: PASS.

- [ ] **Step 2: Write the render test**

- `vi.mock("framer-motion")`: `motion` is a `Proxy` whose `motion.<tag>` renders a plain `<tag>`. It drops `initial`, `animate`, `transition`, `exit`, `variants`, `layout`, `whileHover` and `whileTap`, and adds `data-animate={JSON.stringify(animate)}`. `JSON.stringify` drops `undefined` keys; that's fine, because a missing key is "don't animate". `AnimatePresence` renders its children.
- Stub, by module path: `TournamentMatchup` → `<i data-matchup={`${round}:${region}:${index}`} />`, and also `PlayTournamentButton`, `PlayerScore`, `RestartGameButton` and `PingNotification` → `<i data-stub="<Name>" />`. The real ones need React Query or would bloat the snapshot.
- Serializer `describeTree(el)`: one line per element, in document order, indented by depth. Each line is `tag`, then `testid=…` if present, `class="…"` with whitespace collapsed to single spaces and trimmed, and `animate=…` if present. Consecutive `<i data-matchup>` siblings collapse into one line, `matchups[<first data-matchup> … ×N]`.
- **Tournament cases:** `it.each` over phase × width × selectedRound, one `toMatchSnapshot()` per case, named `${phase} w=${w} sel=${sel}`.
  - phase: `"selection"` (`fieldStore(1)`, `pickChalk`, `tournament` + `tournamentSelection` on) or `"recap"` (the same, plus every `tournamentPlay*` flag, `tournamentPlayGames` and `tournamentRecap` on).
  - width: `[390, 768, 769, 1024, 1025, 1400, 1401, 1700, 1701, 2040, 2041, 2349, 2350, 2351]`.
  - selectedRound: `[1, 2, "sweet sixteen", "elite eight", "final four", "finals", "champion"]`.
  - Dispatch `uiStateActions.screenSize({ screenWidth: w, screenHeight: 900 })` and `selectRound({ newRound: sel })` before rendering `<Tournament />` in a `Provider`. Snapshot after effects flush. Above 2350 the component's own effect resets the round to 1, which is today's behavior.
- **Banner cases:** `<RoundSelectBanner />` over width × selectedRound × picks.
  - width: `[390, 768, 769, 1024, 1025, 1400, 1401, 1700, 1701, 2040, 2041]`.
  - selectedRound: the same seven.
  - picks: `"none"` (a fresh field) or `"chalk"` (`pickChalk`).

- [ ] **Step 3: Run it twice**

Run: `npx vitest run tests/unit/components/Tournament/bracketRender.test.tsx` twice. Expected: the first run writes the snapshot, and the second passes with "0 written".

Spot-check a few entries by hand against the source:
- `selection w=390 sel=champion`: no `position`-driven spacing, and the elite eight / final four columns animate to `max-content`.
- `recap w=1440 …`: the bottom `bracket-column-1` has `overflow-hidden`.
- `w=2350`: no `bracket-column-playin` at all.

If an entry doesn't match the source, fix the mock or the serializer, not the snapshot.

- [ ] **Step 4: Commit**

`test(tournament): pin bracket render output before decomposition`. Commit the snapshot file too.

---

### Task 2: `getRoundLayout`

**Files:**
- Create: `src/functions/tournament/layout/bracketLayout.ts`, `src/functions/tournament/layout/index.ts`
- Modify: `src/functions/tournament/index.ts` (`export * from "./layout";`)
- Test: `tests/unit/functions/tournament/layout/bracketLayout.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type BracketRound = 1 | 2 | "sweet sixteen" | "elite eight" | "final four";
  export const BRACKET_ROUNDS: readonly BracketRound[]; // in that order
  /** Today's ladder branch: 1 = round-of-64 layout ... 6 = finals only; null = no branch matched. */
  export type LayoutStep = 1 | 2 | 3 | 4 | 5 | 6 | null;
  export function getLayoutStep(selectedRound: TournamentRound, screenWidth: number): LayoutStep;
  export interface ColumnLayout { position: number | undefined; expanded: boolean }
  export function getRoundLayout(selectedRound: TournamentRound, screenWidth: number): Record<BracketRound, ColumnLayout>;
  ```
  Task 4's finals spacing uses `getLayoutStep` as well.

- [ ] **Step 1: Write the failing tests**

`getLayoutStep`: the step is the first one whose condition holds, in this order:
1. `sel === 1 || w > 2040`
2. `sel === 2 || w > 1700`
3. `sel === "sweet sixteen" || w > 1400`
4. `sel === "elite eight" || w > 1024`
5. `sel === "final four" || w > 768`
6. `sel === "finals"`
7. otherwise `null`

Use `it.each` over the seven rounds × the widths `[390, 768, 769, 1024, 1025, 1400, 1401, 1700, 1701, 2040, 2041, 2350, 2351]`. Write the expected values as an explicit table, one row per width, giving the step for each of the seven rounds. Examples:
- `w=768: [1,2,3,4,5,6,null]`
- `w=769: [1,2,3,4,5,5,5]`
- `w=2041: all 1`

`getRoundLayout` positions by step (order: R1, R2, S16, E8, F4):

| step | positions |
|---|---|
| 1 | 1, 2, 3, 4, 5 |
| 2 | 0, 1, 2, 3, 4 |
| 3 | 0, 0, 1, 2, 3 |
| 4 | 0, 0, 0, 1, 2 |
| 5 | 0, 0, 0, 0, 1 |
| 6 | all 0 |
| null | all `undefined` |

`expanded` is computed independently of the step:
- R1: `sel === 1 || w > 2040`
- R2: `sel ∈ {1, 2} || w > 1700`
- S16: `sel ∈ {1, 2, "sweet sixteen"} || w > 1400`
- E8: `sel ∉ {"final four", "finals"} || w > 1024`
- F4: `sel !== "finals" || w > 768`

Assert at least these cases:
- `("champion", 390)`: every position `undefined`; E8 and F4 expanded, R1/R2/S16 collapsed.
- `("finals", 768)`: all positions 0, all collapsed.
- `("finals", 769)`: step 5, F4 expanded.
- `(1, 390)`: step 1, R1-F4 expanded.

Freeze inputs with `deepFreeze` where objects are involved.

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/unit/functions/tournament/layout`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement in `bracketLayout.ts`**

Use a threshold table plus `find`, in the style of `getReplayRound`. Don't port the `if` ladder.

- [ ] **Step 4: Run the tests**

Run the layout tests. Expected: PASS.

- [ ] **Step 5: Commit**

`refactor(tournament): extract getRoundLayout from Tournament.tsx`. The component switch comes in Task 3.

---

### Task 3: `<BracketColumn>` and the `Tournament.tsx` rewrite

**Files:**
- Create: `src/components/Tournament/BracketColumn.tsx` (export from `src/components/Tournament/index.ts`)
- Modify: `src/components/Tournament/Tournament.tsx`

**Interfaces:**
- Consumes: `getRoundLayout`, `BracketRound`, `ColumnLayout` (Task 2).
- Produces:
  ```ts
  interface BracketColumnProps { round: BracketRound; half: "top" | "bottom"; layout: ColumnLayout; wide: boolean }
  ```

- [ ] **Step 1: Build `BracketColumn`**

It renders a `motion.div` with:
- `data-testid="bracket-column-<1|2|sweet-sixteen|elite-eight|final-four>"`
- `initial={false}`
- `animate={{ width: layout.expanded ? "max-content" : 0, height: <same> }}`
- the class `` `${overflow} h-max ${wide ? wideClass : gridClass}` ``

Inside it renders one `TournamentRound` per region, each with `roundUIPosition={layout.position}`.

Per-column table (the wide class always starts with `col-span-1 flex flex-col gap-y-16 min-w-300`):

| round | top regions | bottom regions | wide extra (top / bottom) | grid class (top / bottom) |
|---|---|---|---|---|
| 1 | west, east | south, midwest | none / none | `gridRound64Top` / `gridRound64Bottom` |
| 2 | west, east | south, midwest | `relative` / `relative` | `gridRound32Top` / `gridRound32Bottom` |
| sweet sixteen | west, east | south, midwest | `absolute left-120` / `absolute right-120` | `gridSweetSixteenTop` / `…Bottom` |
| elite eight | west, east | south, midwest | `relative left-20` / `relative right-20` | `gridEliteEightTop` / `…Bottom` |
| final four | eastWest | southMidwest | `absolute left-156` / `absolute right-156` | `gridFinalFourTop` / `…Bottom` |

`overflow` is `overflow-x-clip` everywhere except round 1 bottom, which is `overflow-hidden`.

- [ ] **Step 2: Rewrite `Tournament.tsx`**

- Compute `const layout = getRoundLayout(selectedRound, screenWidth)` and `const wide = screenWidth > TOURNAMENT_BREAK_POINT`.
- Render, in today's DOM order:
  1. the top half, from `BRACKET_ROUNDS`
  2. the finals/champion block, inline and unchanged
  3. the bottom half, from `BRACKET_ROUNDS` reversed
  4. the narrow play-in column, inline. It keeps `screenWidth < TOURNAMENT_BREAK_POINT` and uses `layout[1]` for its width/height and position.
- Keep the wide play-in, the banner condition (`<`) and both effects as they are. Target: under ~200 lines.

- [ ] **Step 3: Verify**

Run: `npx vitest run tests/unit/components/Tournament tests/unit/functions/tournament tests/game/tournamentDrivers.test.tsx`. Expected: PASS, snapshot unchanged ("0 written, 0 updated").

- [ ] **Step 4: Commit**

`refactor(tournament): render bracket columns with BracketColumn`.

---

### Task 4: `getRoundSpacing` and round lookups in `TournamentRound`

**Files:**
- Create: `src/functions/tournament/layout/roundSpacing.ts`, `src/functions/tournament/layout/roundStateKeys.ts` (export both from `layout/index.ts`)
- Modify: `src/components/Tournament/TournamentRound.tsx`
- Test: `tests/unit/functions/tournament/layout/roundSpacing.test.ts`, `tests/unit/functions/tournament/layout/roundStateKeys.test.ts`

**Interfaces:**
- Consumes: `getLayoutStep` (Task 2).
- Produces:
  ```ts
  export interface RoundSpacing {
    selectGap?: string; selectPaddingTop?: string; selectPaddingBottom?: string;
    playGap?: string; playPaddingTop?: string; playPaddingBottom?: string;
  }
  export function getRoundSpacing(position: number | "finals" | undefined, selectedRound: TournamentRound, screenWidth: number): RoundSpacing;
  export type DisplayRound = TournamentRound | "playin";
  export const ROUND_STATE_KEYS: Readonly<Record<DisplayRound, { matchupsKey: MatchupsKey | "champion"; picksKey: TournamentPlayerPickRound }>>;
  export type ResultsFlags = Pick<AppState, "tournamentPlayRoundTwo" | "tournamentPlaySweetSixteen" | "tournamentPlayEliteEight" | "tournamentPlayFinalFour" | "tournamentPlayFinals" | "tournamentRecap">;
  export function showsResults(round: DisplayRound, flags: ResultsFlags): boolean;
  ```

- [ ] **Step 1: Write the failing tests**

`getRoundSpacing`. Tuples are (selectGap, selectPaddingTop, selectPaddingBottom, playGap, playPaddingTop, playPaddingBottom):

| position | base values | overrides, applied in order |
|---|---|---|
| 0 or 1 | 1rem, 0, 3rem, 3rem, 0, 4rem | none |
| 2 | 9rem, 4rem, 7rem, 10.5rem, 3.75rem, 7.75rem | `sel≠1 && w<=2040`: play → 15.5rem, 6.5rem, 10rem. `sel∈{E8,F4,finals} && w<=1400`: selectPaddingTop 6rem, playPaddingTop 7rem |
| 3 | 25rem, 12rem, 15rem, 30.5rem, 14rem, 17rem | `sel≠1 && w<=2040`: play → 18rem, 19rem, 22.5rem. `sel∉{1,2} && w<=1700`: playPaddingTop 20rem |
| 4 | 25rem, 28rem, 31rem, 0, 33.75rem, 36.75rem | `sel≠1 && w<2040` (strict): playGap 15.5rem, playPaddingTop 44.5rem |
| 5 | 0, 62rem, 62rem, 0, 75rem, 75rem | none |
| `"finals"` | by `getLayoutStep(sel, w)` | see below |

`"finals"` by step:
- step 1: 0, `w>2350 ? 62rem : 128rem`, 0, 0, `w>2350 ? 75rem : 157rem`, 0
- step 2: 0, 64rem, 0, 0, 97rem, 0
- step 3: 0, 33rem, 0, 0, 47rem, 0
- step 4: 0, 17rem, 0, 0, 22rem, 0
- step 5: 0, 6rem, 0, 0, 9rem, 0
- step 6 and null: 1rem, 0, 0, 3rem, 0, 0

Position `undefined` returns `{}`.

Cases to assert:
- Every position at `sel=2`, at widths 2040 and 2041. Position 4 at w=2040 must not take the override; position 2 must take it.
- Position 2 at `("finals", 1400)` and `("finals", 1401)`.
- Position 3 at `("sweet sixteen", 1700)` and `("sweet sixteen", 1701)`.
- `"finals"` at `(1, 2350)` and `(1, 2351)`.
- `"finals"` at `("finals", 768)` and `("champion", 390)`.
- `getRoundSpacing(undefined, 1, 2400)` deep-equals `{}`.

`ROUND_STATE_KEYS` must equal today's chain exactly:

| round | matchupsKey | picksKey |
|---|---|---|
| playin, 1 | roundOneMatchups | roundTwoPicks |
| 2 | roundTwoMatchups | roundTwoPicks |
| sweet sixteen | roundSweetSixteenMatchups | roundSweetSixteenPicks |
| elite eight | roundEliteEightMatchups | roundEliteEightPicks |
| final four | roundFinalFourMatchups | roundFinalFourPicks |
| finals | roundFinalsMatchups | roundFinalsPicks |
| champion | champion | champion |

`showsResults`:
- `true` for `playin` and `1` always.
- For 2 through finals: `true` when its own flag is on (`tournamentPlayRoundTwo`, …, `tournamentPlayFinals`).
- For any round: `true` when `tournamentRecap` is on.
- `"champion"` only with `tournamentRecap`.
- Test each round with all flags off, with only its own flag on, and with only `tournamentRecap` on.

- [ ] **Step 2: Run the tests**

Expected: FAIL, module not found.

- [ ] **Step 3: Implement both files**

Write spacing as base tuples plus the override conditions above.

- [ ] **Step 4: Run the tests**

Expected: PASS.

- [ ] **Step 5: Switch `TournamentRound.tsx`**

Replace the key chain with `ROUND_STATE_KEYS[round]`, the spacing ladder with `getRoundSpacing(roundUIPosition, selectedRound, screenWidth)`, and the results condition with `showsResults(round, appState)`. The `animate` object reads `spacing.playGap` / `spacing.selectGap` etc. exactly as before. Type the `isPlayinMatchup` guard parameter as `unknown`, not `any`. Target: under ~120 lines.

- [ ] **Step 6: Verify**

Run: `npx vitest run tests/unit/components/Tournament tests/unit/functions/tournament tests/game`. Expected: PASS, snapshot unchanged.

- [ ] **Step 7: Commit**

`refactor(tournament): extract round spacing and state-key lookups from TournamentRound`.

---

### Task 5: `getRoundButtonState` and picks completion in `RoundSelectButton`

**Files:**
- Create: `src/functions/tournament/layout/roundButtonState.ts` (export from `layout/index.ts`)
- Modify: `src/components/Tournament/RoundSelectButton.tsx`
- Test: `tests/unit/functions/tournament/layout/roundButtonState.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type RoundButtonState = "shrink" | "default" | "unchanged";
  export function getRoundButtonState(round: TournamentRound, selectedRound: TournamentRound, screenWidth: number): RoundButtonState;
  export function areRoundPicksComplete(round: TournamentRound, picks: TournamentPlayersPicks["picks"]): boolean;
  ```
  Use whatever type `state.tournamentPlayersPicks.picks` already has in `@/types`.

- [ ] **Step 1: Write the failing tests**

Expected states for the buttons `[1, 2, S16, E8, F4, finals]`, written as S/D/U per selected round. Test every band at both of its edge widths.

| band | sel 1 | sel 2 | sel S16 | sel E8 | sel F4 | sel finals | sel champion |
|---|---|---|---|---|---|---|---|
| >2040 (2041, 2400) | DDDDDD | DDDDDD | DDDDDD | DDDDDD | DDDDDD | DDDDDD | DDDDDD |
| 1701-2040 | UUUUUU | SDUUUU | SDUUUU | SDUUUU | SDUUUU | SDUUUU | UUUUUU |
| 1401-1700 | UUUUUU | SDUUUU | SSDUUU | SSDUUU | SSDUUU | SSDUUU | UUUUUU |
| 1025-1400 | UUUUUU | SDUUUU | SSDUUU | SSSDUU | SSSDUU | SSSDUU | UUUUUU |
| 769-1024 | UUUUUU | SDUUUU | SSDUUU | SSSDUU | SSSSDU | SSSSDU | UUUUUU |
| ≤768 (390, 768) | UUUUUU | SDUUUU | SSDUUU | SSSDUU | SSSSDU | SSSSSD | UUUUUU |

`areRoundPicksComplete`:
- Round 1: `false`.
- Rounds 2 through final four: their `nextPicksKey`-style pick round (`roundTwoPicks`, `roundSweetSixteenPicks`, `roundEliteEightPicks`, `roundFinalFourPicks`) has every team non-empty.
- Finals: both `roundFinalsPicks` and `champion` are complete.
- `"champion"`: `false`. Today that would crash; no button renders it.

Test with a fresh empty picks object, with chalk picks (`pickChalk` on `fieldStore(1)`), and with chalk picks where one `roundFinalsPicks` team is blanked (finals `false`, final four still `true`).

- [ ] **Step 2: Run the tests**

Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`getRoundButtonState`:
- Above 2040, `"default"`.
- Otherwise the band sets the visible column count N: 5 for 1701-2040, 4, 3, 2, and 1 for ≤768.
- Let s = the selected round's index in the six rounds, and r = the button's index. `"champion"` or s = 0 → `"unchanged"`.
- The window's first column is `min(s, 6 - N)`. Buttons before the window → `"shrink"`, the window's first button → `"default"`, everything else → `"unchanged"`.
- Check this rule against every row of the table. If any cell disagrees, use an explicit lookup table instead of the formula; the table above is the contract.

`areRoundPicksComplete`: a pick-keys lookup plus `every`.

- [ ] **Step 4: Run the tests**

Expected: PASS.

- [ ] **Step 5: Switch `RoundSelectButton.tsx`**

Map the state to the `animate` values:
- `shrink` → `{ width: 0, color: NON_CTA_BUTTON_COLOR, fontSize: 0 }`
- `default` → `{ width: TOURNAMENT_ROUND_BUTTON_WITH_BACK_BUTTON_WIDTH }`, with no color or fontSize
- `unchanged` → `{}`

Replace the picks chain with `areRoundPicksComplete(round, playerPicksObj)`. Keep the accent bar, the handler and the markup. Target: under ~120 lines.

- [ ] **Step 6: Verify**

Run: `npx vitest run`. Expected: all PASS, snapshot unchanged.

- [ ] **Step 7: Commit**

`refactor(tournament): extract round button state and picks check from RoundSelectButton`.

---

### Task 6: Docs, full verification, PR

**Files:**
- Modify: `docs/DIAGNOSIS.md`: finding 11, first two bullets. Mark the Tournament / TournamentRound / RoundSelectButton extraction done in step 10b, with the new line counts. The hooks named there were replaced by pure functions; `PlayTournamentGames` was done in 10a. Also update the step 10 roadmap row to "10a, 10b done".
- Modify: `.claude/rules/game-engine.md`: one line naming `tests/unit/components/Tournament/bracketRender.test.tsx` as the render pin for the bracket components, which is updated only for an intended visual change (10c will update it at 2350).
- Modify: memory file `step10-component-decomposition.md`: note that 10b is in progress, with the PR number.

- [ ] **Step 1: Verification**

Run `npx vitest run`, `npm run lint`, `npx tsc --noEmit`, `npm run build` and `npm run e2e`. Expected: all pass. tsc reports only the two known CSS-module errors if `next-env.d.ts` is missing, and none after the build.

- [ ] **Step 2: Check the line counts**

`wc -l` the three components and report them against the targets (~200 / ~120 / ~120).

- [ ] **Step 3: Commit, push and open the PR**

Commit as `docs: step 10b status`. Then push and open the PR against `main` with `gh pr create`. In the body, say:
- it's behavior-preserving
- the snapshot was written before the refactor and never updated
- the line counts
- 10c is next

End the body with the Claude Code attribution line.
