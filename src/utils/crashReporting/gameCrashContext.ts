import type { RootState } from "@/store/store";
import type { TournamentRound } from "@/types";

/** A small summary of the game state, attached to crash reports. */
export type GameCrashContext = {
  /** Names of the appState flags that are true, in key order. */
  activeFlags: string[];
  /** The selected round while in the tournament, otherwise null. */
  tournamentRound: TournamentRound | null;
  yearId: string;
  teamCount: number;
  weeksPlayed: number;
};

export function summarizeGameState(state: RootState): GameCrashContext {
  const { appState, uiState, tournament, teamStats, regularSeasonRecords } = state;
  return {
    activeFlags: Object.entries(appState)
      .filter(([, on]) => on)
      .map(([flag]) => flag),
    tournamentRound: appState.tournament ? uiState.selectedRound : null,
    yearId: tournament.yearId,
    teamCount: Object.values(teamStats.conferenceArrays).reduce(
      (total, teams) => total + teams.length,
      0
    ),
    weeksPlayed: regularSeasonRecords.weeksPlayed,
  };
}
