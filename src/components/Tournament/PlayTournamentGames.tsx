import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AnyAction } from "@reduxjs/toolkit";
import {
  RootState,
  appStateActions,
  uiStateActions,
  tournamentActions,
} from "@/store";
import { GameDataError } from "@/src/functions/generic";
import { getReplayRound } from "@/src/functions/tournament/getReplayRound";
import { ROUND_CONFIG } from "@/src/functions/tournament/roundConfig";
import type { ScoredRound } from "@/types";

/** What to dispatch after a round has been replayed and scored. */
const AFTER_ROUND: Record<ScoredRound, () => AnyAction[]> = {
  1: () => [appStateActions.activateTournamentRoundTwo()],
  2: () => [appStateActions.activateTournamentSweetSixteen()],
  "sweet sixteen": () => [appStateActions.activateTournamentEliteEight()],
  "elite eight": () => [appStateActions.activateTournamentFinalFour()],
  "final four": () => [appStateActions.activateTournamentFinals()],
  finals: () => [
    appStateActions.activateTournamentRecap(),
    uiStateActions.toggleRecapDialog(),
  ],
};

/**
 * Replays the server's results (state.tournament.simulation) round by round:
 * each round's results, then its score against the picks for the next round,
 * then the flag that starts the next round (which re-runs the effect).
 */
export const PlayTournamentGames = () => {
  const dispatch = useDispatch();

  const appState = useSelector((state: RootState) => state.appState);
  const playersPicks = useSelector(
    (state: RootState) => state.tournamentPlayersPicks.picks
  );
  const simulation = useSelector(
    (state: RootState) => state.tournament.simulation
  );

  useEffect(() => {
    const round = getReplayRound(appState);
    if (round === null) return;
    if (!simulation) {
      throw new GameDataError("no tournament results", { round });
    }
    const results = simulation.rounds[round];
    results.forEach((result) => {
      dispatch(
        tournamentActions.setTournamentGameResults({ results: result, round })
      );
    });
    dispatch(
      tournamentActions.recordRoundScore({
        round,
        winningTeams: results.map((result) => result.winningTeam),
        points: simulation.roundPoints[round],
        picks: playersPicks[ROUND_CONFIG[round].nextPicksKey],
      })
    );
    AFTER_ROUND[round]().forEach((action) => dispatch(action));
  }, [dispatch, appState, playersPicks, simulation]);

  return null;
};
