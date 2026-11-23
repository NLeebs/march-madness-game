import type { AppState } from "@/store/appStateSlice";
import type { MatchupsKey, TournamentPlayerPickRound, TournamentRound } from "@/types";

/** A round as TournamentRound draws it: the bracket rounds plus the play-in games. */
export type DisplayRound = TournamentRound | "playin";

/** Where each displayed round reads its results and the player's picks from. */
export const ROUND_STATE_KEYS: Readonly<
  Record<DisplayRound, { matchupsKey: MatchupsKey | "champion"; picksKey: TournamentPlayerPickRound }>
> = {
  playin: { matchupsKey: "roundOneMatchups", picksKey: "roundTwoPicks" },
  1: { matchupsKey: "roundOneMatchups", picksKey: "roundTwoPicks" },
  2: { matchupsKey: "roundTwoMatchups", picksKey: "roundTwoPicks" },
  "sweet sixteen": { matchupsKey: "roundSweetSixteenMatchups", picksKey: "roundSweetSixteenPicks" },
  "elite eight": { matchupsKey: "roundEliteEightMatchups", picksKey: "roundEliteEightPicks" },
  "final four": { matchupsKey: "roundFinalFourMatchups", picksKey: "roundFinalFourPicks" },
  finals: { matchupsKey: "roundFinalsMatchups", picksKey: "roundFinalsPicks" },
  champion: { matchupsKey: "champion", picksKey: "champion" },
};

export type ResultsFlags = Pick<
  AppState,
  | "tournamentPlayRoundTwo"
  | "tournamentPlaySweetSixteen"
  | "tournamentPlayEliteEight"
  | "tournamentPlayFinalFour"
  | "tournamentPlayFinals"
  | "tournamentRecap"
>;

/** The flag that starts each round's games; from then on the round shows results. */
const PLAY_FLAG: Partial<Record<DisplayRound, keyof ResultsFlags>> = {
  2: "tournamentPlayRoundTwo",
  "sweet sixteen": "tournamentPlaySweetSixteen",
  "elite eight": "tournamentPlayEliteEight",
  "final four": "tournamentPlayFinalFour",
  finals: "tournamentPlayFinals",
};

/** Whether a round shows game results (true) or the player's picks (false). */
export function showsResults(round: DisplayRound, flags: ResultsFlags): boolean {
  if (round === "playin" || round === 1 || flags.tournamentRecap) return true;
  const flag = PLAY_FLAG[round];
  return flag !== undefined && flags[flag];
}
