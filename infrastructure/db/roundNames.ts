import type { ScoredRound, TournamentRound } from "@/types";

/** rounds.round_name -> round identifier. */
export const ROUND_BY_NAME: Readonly<Record<string, TournamentRound>> = {
  "1": 1,
  "2": 2,
  "sweet sixteen": "sweet sixteen",
  "elite eight": "elite eight",
  "final four": "final four",
  finals: "finals",
  champion: "champion",
};

/** The scored round a rounds.round_name holds; undefined for "champion" (not scored) and unknown names. */
export function scoredRoundByName(name: string): ScoredRound | undefined {
  const round = ROUND_BY_NAME[name];
  return round === undefined || round === "champion" ? undefined : round;
}
