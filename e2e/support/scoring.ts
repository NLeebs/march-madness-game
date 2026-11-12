import { ROUND_POINTS } from "@/store/tournamentSlice";
import type { TournamentRound } from "@/types";
import { BRACKET_ROUNDS } from "./bracketMap";

export type BarResult = {
  /** Round whose slot the pick bar sits in (2 to champion). */
  round: TournamentRound;
  /** The bar is green: the pick equals the team in that slot. */
  correct: boolean;
};

/** A correct bar in round R scores the points of the round before it (champion slot: finals). */
export function expectedScore(bars: BarResult[]): number {
  return bars.reduce((sum, bar) => {
    if (!bar.correct) return sum;
    const previous = BRACKET_ROUNDS.find((r) => r.next === bar.round);
    if (!previous) throw new Error(`no round before ${String(bar.round)}`);
    return sum + ROUND_POINTS[previous.round as keyof typeof ROUND_POINTS];
  }, 0);
}
