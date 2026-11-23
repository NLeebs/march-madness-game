import {
  LARGE_BREAK_POINT,
  MEDIUM_BREAK_POINT,
  XL_LARGE_BREAK_POINT,
  XXL_LARGE_BREAK_POINT,
  XXXL_LARGE_BREAK_POINT,
} from "@/src/constants";
import type { TournamentPicks, TournamentPlayerPickRound, TournamentRound } from "@/types";

/** "unchanged" = framer-motion leaves the button as it is. */
export type RoundButtonState = "shrink" | "default" | "unchanged";

/** The round buttons, left to right. */
const BUTTON_ROUNDS: readonly TournamentRound[] = [1, 2, "sweet sixteen", "elite eight", "final four", "finals"];

/** How many bracket columns fit at each width: [narrowest width that fits them, count]. */
const VISIBLE_COLUMNS: readonly [number, number][] = [
  [XXL_LARGE_BREAK_POINT, 5],
  [XL_LARGE_BREAK_POINT, 4],
  [LARGE_BREAK_POINT, 3],
  [MEDIUM_BREAK_POINT, 2],
];

/**
 * How a round button animates. Above XXXL every button keeps its default width. Below it,
 * the bracket shows a window of columns starting at the selected round (pulled left so
 * the window ends at the finals): buttons before the window shrink away, the window's
 * first button takes the default width, and the rest are left as they are.
 */
export function getRoundButtonState(
  round: TournamentRound,
  selectedRound: TournamentRound,
  screenWidth: number,
): RoundButtonState {
  if (screenWidth > XXXL_LARGE_BREAK_POINT) return "default";
  const selected = BUTTON_ROUNDS.indexOf(selectedRound);
  if (selected <= 0) return "unchanged";
  const visible = VISIBLE_COLUMNS.find(([minWidth]) => screenWidth > minWidth)?.[1] ?? 1;
  const first = Math.min(selected, BUTTON_ROUNDS.length - visible);
  const index = BUTTON_ROUNDS.indexOf(round);
  if (index < first) return "shrink";
  return index === first ? "default" : "unchanged";
}

/** The pick rounds a round's button checks off once complete. */
const BUTTON_PICKS: Partial<Record<TournamentRound, TournamentPlayerPickRound[]>> = {
  2: ["roundTwoPicks"],
  "sweet sixteen": ["roundSweetSixteenPicks"],
  "elite eight": ["roundEliteEightPicks"],
  "final four": ["roundFinalFourPicks"],
  finals: ["roundFinalsPicks", "champion"],
};

/** Whether every pick shown in a round's column is made. Round 1 has no picks of its own. */
export function areRoundPicksComplete(round: TournamentRound, picks: TournamentPicks): boolean {
  const keys = BUTTON_PICKS[round];
  if (!keys) return false;
  return keys.every((key) =>
    Object.values(picks[key]).every((games) =>
      (games ?? []).every((game) => game.every((team) => team.team !== "")),
    ),
  );
}
