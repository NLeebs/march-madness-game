import type { AppState } from "@/store/appStateSlice";
import type { ScoredRound } from "@/types";

export type ReplayFlags = Pick<
  AppState,
  | "tournamentPlayRoundOne"
  | "tournamentPlayRoundTwo"
  | "tournamentPlaySweetSixteen"
  | "tournamentPlayEliteEight"
  | "tournamentPlayFinalFour"
  | "tournamentPlayFinals"
  | "tournamentRecap"
>;

/** Each round with the flag that starts its replay and the flag that ends it. */
const REPLAY_STEPS: readonly [ScoredRound, keyof ReplayFlags, keyof ReplayFlags][] = [
  [1, "tournamentPlayRoundOne", "tournamentPlayRoundTwo"],
  [2, "tournamentPlayRoundTwo", "tournamentPlaySweetSixteen"],
  ["sweet sixteen", "tournamentPlaySweetSixteen", "tournamentPlayEliteEight"],
  ["elite eight", "tournamentPlayEliteEight", "tournamentPlayFinalFour"],
  ["final four", "tournamentPlayFinalFour", "tournamentPlayFinals"],
  ["finals", "tournamentPlayFinals", "tournamentRecap"],
];

/** The round the tournament replay should play now, or null when none is due. */
export function getReplayRound(flags: ReplayFlags): ScoredRound | null {
  const step = REPLAY_STEPS.find(([, on, done]) => flags[on] && !flags[done]);
  return step ? step[0] : null;
}
