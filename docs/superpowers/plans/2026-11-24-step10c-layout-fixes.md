# Step 10c: Bracket and Nav Layout Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix DIAGNOSIS findings 58, 46, 47 and 48, the last four layout bugs in step 10, and close the step.

**Architecture:** Four separate fixes, each test-first and each in its own commits. 58 is a one-character change in a pure layout function. 46 and 47 change `Tournament.tsx`'s narrow layout: the outer wrapper stops centring, and the post-tournament actions move into a new `TournamentActions` component. On narrow screens it renders at the top of a new vertical scroll wrapper, outside the horizontally clipped grid. 48 is Tailwind classes in `NavigationBar.tsx`. Each intended visual change updates the bracket render pin in its own commit.

**Tech Stack:** Next.js 14, React, Redux Toolkit, Tailwind, framer-motion, vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-step10-component-decomposition-design.md` (section "PR 10c"). Findings text: `docs/DIAGNOSIS.md` 46, 47, 48, 58.

## Global Constraints

- Branch `fix/step10c-layout-fixes` (already created off `main`; the spec commit `db59d7f` is on it). One PR.
- No visible change other than the four fixes. The wide layout (`screenWidth > TOURNAMENT_BREAK_POINT` = 2350) keeps its actions in the finals column, and the nav at `sm` and up looks the same.
- Render pin snapshot updates (`npx vitest run tests/unit/components/Tournament -u`) go in their own commit per fix, and the commit message says which entries moved (`.claude/rules/game-engine.md`).
- Never add a `KNOWN_LAYOUT_ISSUES` entry; remove entries 46 and 48. Follow the e2e sabotage rule for every new e2e assertion (`.claude/rules/e2e.md`).
- No new `any`. Commits use conventional prefixes and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Before the PR: `npx vitest run`, `npm run lint`, `npx tsc --noEmit`, `npm run e2e` all pass.

## Review Focus

1. **Phone (390px) after the tournament:** the narrow actions block (score + See Recap + Play Again) must not cause sideways scroll. The existing `game-flow` `@every-size` run checks horizontal scroll in the "tournament finished" phase on phone, so it must stay green (Task 5 runs it).
2. **Bracket still fully reachable vertically:** with the actions above the grid inside the scroll wrapper, the last matchups of the bottom half must still scroll into view (`assertRoundUnclipped` in the resize sweep covers every round at every width).
3. **Wide layout untouched:** in Tasks 2–3, the render pin diffs at w=2351 may only show the added `testid=tournament-actions`. Any other moved wide entry is a bug.
4. **The whole 2326–2350 band, not just 2349/2350:** Task 2 adds 2326 to the resize sweep.
5. **Play Again with the dialog closed:** two Play Again buttons exist only while the recap dialog is open, so locators outside the dialog are scoped to `tournament-actions` (Task 3).

---

### Task 1: Finding 58, final-four spacing at exactly 2040px

**Files:**
- Modify: `src/functions/tournament/layout/roundSpacing.ts` (case 4)
- Test: `tests/unit/functions/tournament/layout/roundSpacing.test.ts:31-34`
- Snapshot: `tests/unit/components/Tournament/__snapshots__/bracketRender.test.tsx.snap`

**Interfaces:** none new. `getRoundSpacing(position, selectedRound, screenWidth): RoundSpacing` keeps its signature.

- [ ] **Step 1: Change the pin to the fixed behavior.** In `roundSpacing.test.ts`, change the comment `// position 4: strict < 2040` to `// position 4: <= 2040, like positions 2 and 3 (finding 58)`, and change the 2040 row to:

```ts
["pos 4 at 2040", 4, 2, 2040, spacing(["25rem", "28rem", "31rem", "15.5rem", "44.5rem", "36.75rem"])],
```

Keep the 2039 and 2041 rows as they are.

- [ ] **Step 2: Run it and watch it fail.** Run `npx vitest run tests/unit/functions/tournament/layout/roundSpacing.test.ts`. Expected: FAIL on `pos 4 at 2040` (`playGap` received `"0"`, expected `"15.5rem"`).

- [ ] **Step 3: Fix it.** In case 4, change `screenWidth < XXXL_LARGE_BREAK_POINT` to `<=` and delete the `// strictly below, unlike positions 2 and 3` comment.

- [ ] **Step 4: Run it again.** Run the same command. Expected: PASS.

- [ ] **Step 5: Commit.** `git commit -m "fix(tournament): final-four spacing at exactly 2040px matches 2039 (finding 58)"` with the source and unit test.

- [ ] **Step 6: Update the render pin.** Run `npx vitest run tests/unit/components/Tournament` and confirm that only `Tournament render pin > * w=2040 sel=<not 1>` entries fail. Then run it with `-u` and check `git diff --stat` and the diff: only w=2040 entries may move, and only the final-four column's play `animate` / gap / padding. Commit with `test: update bracket render pin for finding 58 (w=2040 final four)`.

---

### Task 2: Finding 46, no sideways scroll at 2326–2350px

**Files:**
- Modify: `src/components/Tournament/Tournament.tsx` (root `motion.div` className)
- Modify: `e2e/support/layout.ts:269-281` (remove the finding 46 entry)
- Modify: `e2e/resize.spec.ts` (`RESIZE_WIDTHS`, `EXPECTED_SIGNATURES`, doc comment)
- Snapshot: `bracketRender.test.tsx.snap`

**Interfaces:** none new.

- [ ] **Step 1: Make the check strict.** Delete the laptop / `BRACKET_PHASES` / `[2349, 2350]` entry from `KNOWN_LAYOUT_ISSUES`. Add `2326` to `RESIZE_WIDTHS` between `XXXL_LARGE_BREAK_POINT` and `TOURNAMENT_BREAK_POINT - 1`, with the comment `// first width where max-w-tourny (2325px) used to overhang (finding 46)`. Add an `EXPECTED_SIGNATURES[2326]` entry copied from the 2349 entry: both widths are in the same band (> 2040, <= 2350).

- [ ] **Step 2: Confirm the copied signature.** Run `E2E_MEASURE_SIGNATURES=1 npx playwright test e2e/resize.spec.ts --project=laptop --grep "measure 2326px"`. Expected: the printed entry equals the copied one. If it differs, paste the printed one instead.

- [ ] **Step 3: Watch the sweep fail.** Run `npx playwright test e2e/resize.spec.ts --project=laptop`. Expected: FAIL at the first bracket phase at 2326px with `page scrolls sideways: scrollWidth ... > viewport 2326`.

- [ ] **Step 4: Fix it.** Apply `mx-auto max-w-tourny` to the root `motion.div` only when `wide`. The narrow layout gets `grid grid-flow-row`.

- [ ] **Step 5: Run it again.** Run the same command. Expected: PASS.

- [ ] **Step 6: Commit.** `fix(tournament): bracket no longer scrolls sideways at 2326-2350px (finding 46)`, with `Tournament.tsx`, `layout.ts` and `resize.spec.ts`. Update the `RESIZE_WIDTHS` doc comment to mention 2326 in the same commit.

- [ ] **Step 7: Update the render pin.** Run `-u` as in Task 1. Expected diff: only the root line's class on every narrow width (390–2350), with `mx-auto max-w-tourny` dropped. Nothing at 2351. Commit with `test: update bracket render pin for finding 46 (narrow root wrapper)`.

---

### Task 3: Finding 47, See Recap and Play Again reachable with round 1 selected

**Files:**
- Create: `src/components/Tournament/TournamentActions.tsx`
- Modify: `src/components/Tournament/index.ts` (export it)
- Modify: `src/components/Tournament/Tournament.tsx`
- Modify: `e2e/resize.spec.ts` (steps 4–5 of the live test)
- Snapshot: `bracketRender.test.tsx.snap`

**Interfaces:**
- Produces: `export const TournamentActions: React.FC`. It reads `appState` from Redux and renders exactly today's block: `<div data-testid="tournament-actions" className="flex flex-col justify-start items-center gap-4 mb-4">` holding `PlayerScore` (when `tournamentPlayGames`), the See Recap `Button` dispatching `uiStateActions.toggleRecapDialog()` (when `tournamentRecap`), and `RestartGameButton` (when `tournamentRecap`).

- [ ] **Step 1: Write the failing e2e check.** In the live resize test, between step 4's `await timedSweep("played");` and step 5, add a block. The sweep above ended at 1440px after passing 2350, so round 1 is selected:

```ts
// 4b. Finding 47: with round 1 selected the post-tournament actions must still be reachable.
expect((await readState(page)).uiState.selectedRound, "sweep past 2350 selects round 1").toBe(1);
const actions = page.getByTestId("tournament-actions");
await assertUsable(actions.getByRole("button", { name: "See Recap" }));
await assertUsable(actions.getByRole("button", { name: "Play Again" }));
```

Then in step 5, delete `await showRound(page, "finals");` and replace the three-line comment with `// 5. Recap dialog open (round 1 still selected).`.

- [ ] **Step 2: Watch it fail.** Run `npx playwright test e2e/resize.spec.ts --project=laptop`. Expected: FAIL at the `tournament-actions` locator (the test id does not exist yet). Before adding the test id, the honest failure is the button sitting off-screen. To see that one, temporarily put `data-testid="tournament-actions"` on today's actions div, run again and confirm `assertUsable` fails on See Recap, then revert.

- [ ] **Step 3: Build `TournamentActions`.** Move the block and `showTournamentRecapButtonHandler` out of `Tournament.tsx` into the new file, and export it from the barrel. In `Tournament.tsx`:
  - Wide: render `<TournamentActions />` where the block is today (inside the finals column, after `PlayTournamentButton`).
  - Narrow: the grid's `w-screen h-[calc(100vh-9rem)] overflow-x-hidden overflow-y-scroll scrollable-container pb-12` move to a new wrapper `div` with `data-testid="bracket-scroll"`. The wrapper holds, in order, `{(appState.tournamentPlayGames || appState.tournamentRecap) && <TournamentActions />}` and then the grid. The grid keeps `relative grid ${styles.tournamentGrid}`, and its children are unchanged.
  - Wide keeps the grid exactly as today, with no wrapper.

  The actions sit under the round banner, centred by their own `items-center` inside the full-width wrapper, and scroll away with the bracket.

- [ ] **Step 4: Run it again.** Run the same command. Expected: PASS. Also run `npx playwright test e2e/game-flow.spec.ts` (phone, tablet and laptop: the "tournament finished" phase must not scroll sideways on phone; Review Focus 1).

- [ ] **Step 5: Commit.** `fix(tournament): post-tournament actions sit under the round banner on narrow screens (finding 47)`.

- [ ] **Step 6: Update the render pin.** Run `-u`. Expected diff: narrow widths get the `bracket-scroll` wrapper, one level deeper. Recap entries show `tournament-actions` above the grid instead of inside the finals column. w=2351 entries only gain `testid=tournament-actions` (Review Focus 3). Commit with `test: update bracket render pin for finding 47 (narrow actions above the grid)`.

---

### Task 4: Finding 48, signed-in nav fits a 390px phone

**Files:**
- Modify: `src/components/General/NavigationBar.tsx` (signed-in group)
- Modify: `e2e/support/layout.ts` (remove the finding 48 entry; if the array is now empty, keep it as `[]` with its type)

**Interfaces:** none.

- [ ] **Step 1: Make the check strict.** Delete the phone / `["dashboard"]` entry from `KNOWN_LAYOUT_ISSUES`.

- [ ] **Step 2: Watch it fail.** Run `npx playwright test e2e/dashboard.spec.ts --project=phone`. Expected: FAIL with `page scrolls sideways: scrollWidth 405 > viewport 390`.

- [ ] **Step 3: Fix it.** The signed-in group's div becomes `gap-1 sm:gap-2`, and the Dashboard button's className `py-3 px-2 sm:px-4`. That saves about 20px below `sm` and changes nothing from `sm` up. Logout and the logged-out group stay as they are.

- [ ] **Step 4: Run it again.** Run the same command, then `npx playwright test e2e/dashboard.spec.ts e2e/auth.spec.ts`. Expected: PASS. Linux CI fonts can differ by a few px, so if CI fails here, take `px-1` on Logout below `sm` (`p-2` -> `py-2 px-1 sm:p-4`) as well.

- [ ] **Step 5: Commit.** `fix(nav): signed-in buttons fit a 390px phone (finding 48)`.

---

### Task 5: Docs and full verification

**Files:**
- Modify: `docs/DIAGNOSIS.md` (findings 46, 47, 48, 58; roadmap row 10)
- Modify: `.claude/rules/e2e.md` (KNOWN_LAYOUT_ISSUES table; resize section)

- [ ] **Step 1: DIAGNOSIS.** Append `**Fixed in step 10c.**` to findings 46, 47, 48 and 58, with one sentence each on the fix (as findings 44 and 45 do). In roadmap row 10, replace "10c next (findings 46, 47, 48, 58)" with "10c done (findings 46, 47, 48, 58)" and mark step 10 done.

- [ ] **Step 2: e2e rules.** Replace the table under `## Layout checks and KNOWN_LAYOUT_ISSUES` with `None today (findings 46 and 48 were fixed in step 10c).`, keeping the "Never add an entry..." line. In the resize section, add a bullet: `- Width 2326 is swept: the first width where the old centred max-w-tourny wrapper overhung (finding 46).`

- [ ] **Step 3: Full verification.** Run `npx vitest run`, `npm run lint`, `npx tsc --noEmit` and `npm run e2e`. Expected: all pass. The only tsc errors allowed are the two documented CSS-module ones, and only if `next-env.d.ts` is missing.

- [ ] **Step 4: Commit.** `docs: mark findings 46, 47, 48, 58 fixed and step 10 done`.
