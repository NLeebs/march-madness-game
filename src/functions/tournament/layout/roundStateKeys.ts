import type { AppState } from "@/store/appStateSlice";
import type { MatchupsKey, ScoredRound, TournamentPlayerPickRound, TournamentRound } from "@/types";
import { ROUND_CONFIG, SCORED_ROUNDS } from "../roundConfig";

/** A round as TournamentRound draws it: the bracket rounds plus the play-in games. */
export type DisplayRound = TournamentRound | "playin";

type RoundStateKeys = {
  matchupsKey: MatchupsKey | "champion";
  picksKey: TournamentPlayerPickRound;
};

/**
 * A scored round shows its own matchups and the picks the round before it fills in
 * (round 1 shows the round-two picks it feeds). Derived from ROUND_CONFIG.
 */
function scoredRoundKeys(round: ScoredRound): RoundStateKeys {
  const index = SCORED_ROUNDS.indexOf(round);
  const feeder = index === 0 ? round : SCORED_ROUNDS[index - 1];
  return { matchupsKey: ROUND_CONFIG[round].matchupsKey, picksKey: ROUND_CONFIG[feeder].nextPicksKey };
}

/** Where each displayed round reads its results and the player's picks from. */
export const ROUND_STATE_KEYS: Readonly<Record<DisplayRound, RoundStateKeys>> = {
  playin: scoredRoundKeys(1),
  ...(Object.fromEntries(SCORED_ROUNDS.map((round) => [round, scoredRoundKeys(round)])) as Record<
    ScoredRound,
    RoundStateKeys
  >),
  champion: { matchupsKey: ROUND_CONFIG.finals.nextMatchupsKey, picksKey: ROUND_CONFIG.finals.nextPicksKey },
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
