# Step 10: component decomposition, replay pacing and bracket layout fixes

Date: 2026-11-23. Roadmap step 10 in `docs/DIAGNOSIS.md`.

## Why

The tournament UI is the hardest code in the repo to change. `Tournament.tsx` (564 lines) repeats one column block 11 times around a 40-line `if` ladder. `TournamentRound.tsx` (309) and `RoundSelectButton.tsx` (287) have their own breakpoint ladders and round-name `if` chains. Five small layout bugs (findings 44, 46, 47, 48) live in that code and are hard to fix safely in its current shape. Step 10 makes this code readable and unit-testable **without changing how the game looks or plays**, and then fixes the layout bugs in the cleaner code. The Playwright suite (step 7) and the game tests (step 6) are the safety net.

One deliberate, visible change is included: the regular season plays week by week (finding 45), as chosen below.

## Goals

- Pull the layout `if` ladders out into pure, unit-tested functions; render the bracket columns with one reusable component.
- Use `ROUND_CONFIG` (or a sibling map in `src/functions/tournament/`) for round-to-state-key lookups instead of `if` chains.
- Collapse `PlayTournamentGames`' six near-identical effects into one.
- Finding 41: one component holds the conditions that mount the tournament replay drivers; `App.tsx` and `tests/game/helpers/runGame.ts` both use it.
- Finding 45 (+ 33): the season replays week by week, about 0.15 s per week (about 4.5 s for 30 weeks), without blocking the page.
- Findings 44, 46, 47, 48: fixed, with the e2e `KNOWN_LAYOUT_ISSUES` entries removed and the resize test's 2350 skip dropped.

## Non-goals

- Moving responsive layout from JavaScript (`screenWidth` in Redux + framer-motion) to CSS/Tailwind breakpoints (finding 13). Considered and rejected for this step (see Approaches).
- `appStateSlice` as a phase enum (finding 10), StrictMode (14), form `id`s (49), tournament playback game by game (50).
- Making `TeamBar` / `TournamentMatchup` prop-driven (finding 11, last bullet). Allowed only if a PR needs it; not a goal.
- Any change to the server, the API, the database, or the engine's random draws.

## Anti-goals (a failure even if it "works")

- Any visible change to the bracket other than the four layout fixes: different spacing, column positions, animation targets or breakpoints at any width.
- Any change to what gets dispatched during the tournament replay (actions, payloads, order).
- Loosening e2e checks to make a refactor pass.

## Constraints

- Behavior-preserving refactors land in commits separate from the behavior changes (45, 44, 46-48), so a reviewer can tell them apart.
- The full e2e suite (`npm run e2e`) must pass after each PR, plus `npx vitest run`, `npm run lint`, `npx tsc --noEmit`.
- TDD per `CLAUDE.md`: unit tests for each extracted pure function are written first, as characterization tests of today's ladder (every round x every breakpoint band, including the exact boundary widths), before the component is switched over to them.
- No new `any`. Type new code as if `strict` were on.
- `.claude/rules/game-engine.md` and `.claude/rules/e2e.md` are updated in the PR that makes their text stale.

## Approaches

1. **Same behavior, extracted into pure functions and components (chosen).** Keep the JS-driven layout as it is (screen width in Redux, framer-motion animating widths and paddings). Turn each ladder into a pure function with tests; replace the 11 column blocks with `<BracketColumn>`. Every pixel value stays the same, so the e2e layout and resize checks guard the refactor directly. Fix the layout bugs afterwards, one at a time.
2. **Move responsive layout to CSS/Tailwind breakpoints.** Deletes most JS layout math and the re-render on resize, but changes animation and spacing in ways that are hard to match exactly, and mixes a rewrite into a refactor the e2e checks can't separate. Better as its own later step.
3. **Fix only the findings, skip the decomposition.** Smaller, but leaves the ladders the bugs live in and misses the point of the step.

The user picked approach 1.

## Decisions made with the user

- **Season pacing (finding 45): option B.** Weeks play one after another at about 0.15 s each (about 4.5 s in total), so the player sees weeks tick by in roughly the time the season takes today, with no page freeze. Rejected: A (0.5 s per week, 15 s season) and C (keep it instant, only remove the freeze).
- **Approach 1** above.
- **Split into three PRs** (below), like step 9.

## Design

### PR 10a: replay wiring and pacing (findings 41, 45, 33)

**`TournamentReplay` component (finding 41).** A new component in `src/components/Tournament/` (exported from the barrel) renders `PlayPlayinGames` when `tournament && tournamentPlayPlayinGames`, and `PlayTournamentGames` when `tournament && tournamentPlayGames && !tournamentRecap`. Exactly today's conditions. `App.tsx` renders `<TournamentReplay />` in place of the two conditional blocks; `runGame.ts` deletes `TournamentDrivers` and renders `TournamentReplay`. Remove the "keep in sync" note from `game-engine.md`.

**One effect in `PlayTournamentGames`.** A pure helper (e.g. `getReplayRound(appState)` in `src/functions/tournament/`) returns the round to replay now, or `null`, from the same flag pairs the six effects check today (`tournamentPlayRoundOne && !tournamentPlayRoundTwo` -> 1, ..., `tournamentPlayFinals && !tournamentRecap` -> `"finals"`). A per-round table gives the picks key passed to `recordRoundScore` (`roundTwoPicks`, ..., `champion` for finals; this is `ROUND_CONFIG[round].nextPicksKey` if it matches for every round, otherwise a small explicit map) and the `appStateActions` creator to dispatch next. After finals it dispatches `activateTournamentRecap()` then `uiStateActions.toggleRecapDialog()`, as today. The dispatched actions, payloads and order must be identical to today's: a test records the full action list of a replay before the change and asserts it after. The browser draws no random numbers here (since step 9a-2 it only replays `tournament.simulation`), so the draw-order pins are unaffected; update the sentence in `game-engine.md` that says collapsing the effects is a draw-order change.

**Season pacing (findings 45 and 33).** `PlayRegularSeasonGames` replays the weeks in sequence, one week per tick. The 4.5 s is the on-screen target: week n is due at n x 0.15 s after the replay starts (deadline-based, not "wait 0.15 s after the previous week finished"), and never runs before the previous week has been applied. Rename `TIMER_PER_REGULAR_SEASON_GAME` to something accurate such as `SECONDS_PER_REGULAR_SEASON_WEEK`, value 0.15. The loop stops if the component unmounts (no dispatches after unmount; today's code has no cleanup). If it mounts again mid-season it resumes from `weeksPlayed` (today it only starts at `weeksPlayed === 0`, which would leave a remounted season stuck). "Season played" is set once, not once per week (finding 33). After week 30, `activateSelectionSunday` is dispatched as today.

Applying a week must not freeze the page noticeably. Finding 45's ~5 s freeze over 30 weeks suggests ~150 ms per week, mostly from ~180 per-game dispatches each notifying subscribers. My call (builder check): measure a week's cost in a production build first. If it is over about 50 ms, add a per-week action (e.g. `addRegularSeasonWeekResults(results)`) whose reducer applies the games in schedule order with the same per-game logic, so the resulting state is identical to the per-game dispatches. The draw-order pins compare stored season results and records, not dispatched actions, so they are unaffected. If the action list changes, `PlayRegularSeasonGames.test.tsx` asserts one week action per week in order, with the same game payloads; otherwise it keeps asserting today's per-game actions. Either way its timing assertions change from "nothing before 0.5 s, everything at 0.5 s" to "week n's results arrive at n x 0.15 s, none earlier".

**Out of scope:** the ~8-10 s from Start to the season screen, which finding 45 also mentions. It comes from the season request and the screen transition, not the replay. In `DIAGNOSIS.md`, mark 45 fixed for the replay, and split the Start latency into a new open finding.

**E2E.** The resize test still pauses `page.clock` to hold the season still for its full-state comparison; that stays. Update its comments and `.claude/rules/e2e.md` (finding 45 no longer blocks the page). Check that phase timeouts still fit a ~4.5 s season. Mark findings 41, 45 and 33 fixed in `DIAGNOSIS.md`.

### PR 10b: component decomposition (finding 11, roadmap step 10 core)

All behavior-preserving. Pure functions live in `src/functions/tournament/` (or a `layout` subfolder there), are exported from the barrel the way the other tournament functions are, and are imported by module path where the barrel would pull in Firebase (as step 9 does for `scoreRound`). Tests go in `tests/unit/functions/tournament/`.

- **`getRoundLayout(selectedRound, screenWidth)`** returns, for each bracket round (1, 2, sweet sixteen, elite eight, final four), its UI position (today's `firstRoundUIPosition` etc.) and whether its column is expanded (`max-content`) or collapsed (`0`). Replaces both the ladder at the top of `Tournament.tsx` and the per-column `animate` conditions. Note that today's ladder leaves positions `undefined` in one case (`selectedRound` not matched and `screenWidth <= MEDIUM_BREAK_POINT`, e.g. selected round `"champion"` if that can happen); the characterization tests pin whatever today returns, including `undefined`.
- **`<BracketColumn>`** renders one `motion.div` column: `data-testid`, the expand/collapse animation, the wide-layout classes (each column's own `absolute left-120` / `relative right-20` etc.) or the narrow-layout grid-area class, and its `TournamentRound`s. The left and right halves of the bracket (west/east, south/midwest) use it with a side prop. The finals/champion block and the play-in columns may stay inline if a generic column doesn't fit them; builder's call. The rendered DOM order and every class string must stay the same (the narrow layout uses CSS grid areas, the wide one DOM order).
- **`getRoundSpacing(roundUIPosition, selectedRound, screenWidth)`** returns today's six values (select gap/paddings, play gap/paddings) from `TournamentRound`'s ladder, unchanged. Note today's mixed `<` / `<=` comparisons against `XXXL_LARGE_BREAK_POINT` in positions 2 and 4: pin them as they are.
- **Round-to-state keys in `TournamentRound`.** Replace the `roundResultsName` / `playersPicksName` chain with a lookup table (`playin` and `1` share round one's keys; `champion` maps to `champion`/`champion`). Values unchanged. Same for the "show results or picks" condition (`round === 2 && tournamentPlayRoundTwo`, ...): a lookup from round to the appState flag.
- **`RoundSelectButton`.** Extract the shrink/default decision as a pure function `getRoundButtonState(round, selectedRound, screenWidth)` returning `"shrink" | "default" | "unchanged"` (today some band/round combinations set neither, leaving the variables `undefined`, which framer-motion treats as "don't animate"; pin that as `"unchanged"`). Replace the picks-key chain with a lookup; type `checkIfPicksWereMade` properly (it is untyped today).
- Optional, builder's call: shared `isWideBracket(screenWidth)` helper for the many `screenWidth > TOURNAMENT_BREAK_POINT` checks. If added in 10b it must keep today's semantics exactly (10c changes the boundary).

Target sizes, a guide not a rule: `Tournament.tsx` under ~200 lines; `TournamentRound.tsx` and `RoundSelectButton.tsx` under ~120 each.

### PR 10c: layout fixes (findings 46, 47, 48, 58; 44 was fixed in 10b)

Each fix is its own commit with a failing test first (e2e or unit, whichever reproduces it), and removes its `KNOWN_LAYOUT_ISSUES` entry or e2e workaround.

- **44: at exactly 2350px neither play-in column renders.** Make every check against `TOURNAMENT_BREAK_POINT` agree that 2350 belongs to the narrow layout (wide is `> 2350`, narrow is `<= 2350`), through one helper. Only `TOURNAMENT_BREAK_POINT` checks change. Every other band check (`XXXL_LARGE_BREAK_POINT` = 2040 and below) gives the same answer at 2349 and 2350, so no 10b unit pin for those ladders changes. Pins on the wide/narrow switch itself move from 2350 to 2351. Drop the 2350 skip in `e2e/resize.spec.ts` and add 2350 to the sweep.
- **46: bracket screens scroll sideways at 2326-2349px.** The `mx-auto max-w-tourny` wrapper should constrain only the wide layout; in the narrow layout its full-width children (banner, grid with `w-screen`) must not overhang. Builder picks the CSS; acceptance is the resize sweep passing at 2326-2350 with the entry removed.
- **47: after the tournament, with round 1 selected, "See Recap" and "Play Again" are unreachable in the narrow layout.** They sit in the finals grid area to the right of the overflow-hidden grid. My call (the user can correct it in review): in the narrow layout, render the post-tournament actions (player score, See Recap, Play Again) outside the horizontally clipped grid, centred under the round banner, so they are reachable whichever round is selected. The wide layout keeps them where they are. Remove the resize test's workaround and assert both buttons are clickable with round 1 selected.
- **48: signed-in nav group overflows a 390px phone by 15px.** My call: tighten the signed-in group below the `sm` breakpoint (smaller horizontal padding / gap on Dashboard and Logout) so it fits, without changing the look at `sm` and up. Remove the entry.
- **58: at exactly 2040px the final-four column keeps the unscrolled spacing** (added 2026-11-24, found in the 10b review). In `getRoundSpacing` position 4 checks `screenWidth < XXXL_LARGE_BREAK_POINT` while positions 2 and 3 use `<=`. Switch it to `<=` so with round 2 selected at 2040px final four gets `playGap 15.5rem` / `paddingTop 44.5rem` and lines up with the elite-eight games feeding it. A visible change: update the `pos 4 at 2040` unit pin and the render snapshot on purpose. User confirmed 2026-11-24, along with the finding 47 call above.

Mark findings 46, 47, 48 and 58 fixed in `DIAGNOSIS.md`, and the step 10 roadmap row done after 10c.

## Left to the builder

- File and function names, and whether `getRoundLayout` / `getRoundSpacing` live together.
- How generic `<BracketColumn>` gets (finals and play-in columns may stay inline).
- The exact CSS for findings 46 and 48, within the acceptance above.
- Commit granularity inside each PR, as long as refactors and behavior changes stay in separate commits.
