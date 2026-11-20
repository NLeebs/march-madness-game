import { NUMBER_OF_TEAMS, POINTS_PER_WIN } from "@/src/constants";
import type { GameResult, RegularSeasonTeam } from "@/types";

/**
 * Records one regular season game. Mutates `records` in place, so it works on
 * a plain object and on an Immer draft. The winner earns
 * NUMBER_OF_TEAMS - loserRPI + POINTS_PER_WIN selection points.
 */
export function applySeasonGameResult(
  records: Record<string, RegularSeasonTeam>,
  result: GameResult
): void {
  if (result.favoredScore > result.underdogScore) {
    records[result.favoredTeam].wins++;
    records[result.underdogTeam].losses++;
    records[result.favoredTeam].tournamentSelectionScore +=
      NUMBER_OF_TEAMS - result.underdogRPI + POINTS_PER_WIN;
  } else {
    records[result.underdogTeam].wins++;
    records[result.favoredTeam].losses++;
    records[result.underdogTeam].tournamentSelectionScore +=
      NUMBER_OF_TEAMS - result.favoredRPI + POINTS_PER_WIN;
  }
}
