import {
  TOURNAMENT_BREAK_POINT,
  XL_LARGE_BREAK_POINT,
  XXL_LARGE_BREAK_POINT,
  XXXL_LARGE_BREAK_POINT,
} from "@/src/constants";
import type { TournamentRound } from "@/types";
import { getLayoutStep } from "./bracketLayout";

/** A bracket round's gap and paddings while picking (select) and while games play (play). */
export interface RoundSpacing {
  selectGap?: string;
  selectPaddingTop?: string;
  selectPaddingBottom?: string;
  playGap?: string;
  playPaddingTop?: string;
  playPaddingBottom?: string;
}

type Tuple = [string, string, string, string, string, string];
const spacing = ([selectGap, selectPaddingTop, selectPaddingBottom, playGap, playPaddingTop, playPaddingBottom]: Tuple): RoundSpacing => ({
  selectGap,
  selectPaddingTop,
  selectPaddingBottom,
  playGap,
  playPaddingTop,
  playPaddingBottom,
});

/** The finals column, by layout step (see getLayoutStep); steps 6 and null share the last entry. */
const FINALS_BY_STEP: Record<2 | 3 | 4 | 5, Tuple> = {
  2: ["0", "64rem", "0", "0", "97rem", "0"],
  3: ["0", "33rem", "0", "0", "47rem", "0"],
  4: ["0", "17rem", "0", "0", "22rem", "0"],
  5: ["0", "6rem", "0", "0", "9rem", "0"],
};
const FINALS_ALONE: Tuple = ["1rem", "0", "0", "3rem", "0", "0"];

/**
 * Spacing for a bracket round at a UI position (its column counted from the leftmost visible
 * one; "finals" = the finals column). The spacing lines matchups up with the previous round.
 */
export function getRoundSpacing(
  position: number | "finals" | undefined,
  selectedRound: TournamentRound,
  screenWidth: number,
): RoundSpacing {
  const scrolled = selectedRound !== 1;
  switch (position) {
    case 0:
    case 1:
      return spacing(["1rem", "0", "3rem", "3rem", "0", "4rem"]);
    case 2: {
      const s = spacing(["9rem", "4rem", "7rem", "10.5rem", "3.75rem", "7.75rem"]);
      if (scrolled && screenWidth <= XXXL_LARGE_BREAK_POINT) {
        Object.assign(s, { playGap: "15.5rem", playPaddingTop: "6.5rem", playPaddingBottom: "10rem" });
      }
      if (
        (selectedRound === "elite eight" || selectedRound === "final four" || selectedRound === "finals") &&
        screenWidth <= XL_LARGE_BREAK_POINT
      ) {
        Object.assign(s, { selectPaddingTop: "6rem", playPaddingTop: "7rem" });
      }
      return s;
    }
    case 3: {
      const s = spacing(["25rem", "12rem", "15rem", "30.5rem", "14rem", "17rem"]);
      if (scrolled && screenWidth <= XXXL_LARGE_BREAK_POINT) {
        Object.assign(s, { playGap: "18rem", playPaddingTop: "19rem", playPaddingBottom: "22.5rem" });
      }
      if (scrolled && selectedRound !== 2 && screenWidth <= XXL_LARGE_BREAK_POINT) {
        s.playPaddingTop = "20rem";
      }
      return s;
    }
    case 4: {
      const s = spacing(["25rem", "28rem", "31rem", "0", "33.75rem", "36.75rem"]);
      if (scrolled && screenWidth <= XXXL_LARGE_BREAK_POINT) {
        Object.assign(s, { playGap: "15.5rem", playPaddingTop: "44.5rem" });
      }
      return s;
    }
    case 5:
      return spacing(["0", "62rem", "62rem", "0", "75rem", "75rem"]);
    case "finals": {
      const step = getLayoutStep(selectedRound, screenWidth);
      if (step === 1) {
        const wide = screenWidth > TOURNAMENT_BREAK_POINT;
        return spacing(["0", wide ? "62rem" : "128rem", "0", "0", wide ? "75rem" : "157rem", "0"]);
      }
      if (step === null || step === 6) return spacing(FINALS_ALONE);
      return spacing(FINALS_BY_STEP[step]);
    }
    default:
      return {};
  }
}
