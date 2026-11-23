import {
  LARGE_BREAK_POINT,
  MEDIUM_BREAK_POINT,
  XL_LARGE_BREAK_POINT,
  XXL_LARGE_BREAK_POINT,
  XXXL_LARGE_BREAK_POINT,
} from "@/src/constants";
import type { TournamentRound } from "@/types";

/** The bracket rounds drawn as columns on each half, outermost first. */
export type BracketRound = 1 | 2 | "sweet sixteen" | "elite eight" | "final four";

export const BRACKET_ROUNDS: readonly BracketRound[] = [
  1,
  2,
  "sweet sixteen",
  "elite eight",
  "final four",
];

/**
 * Which bracket layout applies: 1 = every column from round 1 on, 2 = from round 2 on,
 * ... 5 = final four only, 6 = finals only, null = none (selected round "champion" on a
 * phone).
 */
export type LayoutStep = 1 | 2 | 3 | 4 | 5 | 6 | null;

/** Step n applies when round n is selected or the screen is wider than its breakpoint. */
const STEPS: readonly [Exclude<LayoutStep, null>, TournamentRound, number][] = [
  [1, 1, XXXL_LARGE_BREAK_POINT],
  [2, 2, XXL_LARGE_BREAK_POINT],
  [3, "sweet sixteen", XL_LARGE_BREAK_POINT],
  [4, "elite eight", LARGE_BREAK_POINT],
  [5, "final four", MEDIUM_BREAK_POINT],
  [6, "finals", Infinity],
];

/** The first step whose round is selected or whose breakpoint the screen is wider than. */
export function getLayoutStep(selectedRound: TournamentRound, screenWidth: number): LayoutStep {
  const step = STEPS.find(([, round, minWidth]) => selectedRound === round || screenWidth > minWidth);
  return step ? step[0] : null;
}

export interface ColumnLayout {
  /** The column's place counting from the leftmost visible column (1), 0 = scrolled away. */
  position: number | undefined;
  /** Whether the column is drawn at full width (max-content) or collapsed to 0. */
  expanded: boolean;
}

/** The rounds whose selection keeps each column expanded, and the width above which it always is. */
const EXPANDED_WHEN: Record<BracketRound, [(selected: TournamentRound) => boolean, number]> = {
  1: [(s) => s === 1, XXXL_LARGE_BREAK_POINT],
  2: [(s) => s === 1 || s === 2, XXL_LARGE_BREAK_POINT],
  "sweet sixteen": [(s) => s === 1 || s === 2 || s === "sweet sixteen", XL_LARGE_BREAK_POINT],
  "elite eight": [(s) => s !== "final four" && s !== "finals", LARGE_BREAK_POINT],
  "final four": [(s) => s !== "finals", MEDIUM_BREAK_POINT],
};

/** Each bracket column's position and expansion for the selected round and screen width. */
export function getRoundLayout(
  selectedRound: TournamentRound,
  screenWidth: number,
): Record<BracketRound, ColumnLayout> {
  const step = getLayoutStep(selectedRound, screenWidth);
  const entries = BRACKET_ROUNDS.map((round, i) => {
    // at step n the first n-1 columns have scrolled away (0); the rest count up from 1
    const position = step === null ? undefined : Math.max(0, i + 2 - step);
    const [selectedKeepsIt, minWidth] = EXPANDED_WHEN[round];
    const expanded = selectedKeepsIt(selectedRound) || screenWidth > minWidth;
    return [round, { position, expanded }] as const;
  });
  return Object.fromEntries(entries) as Record<BracketRound, ColumnLayout>;
}
