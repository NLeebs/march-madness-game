// React Functions
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  RootState,
  appStateActions,
  tournamentPlayersPicksActions,
  tournamentActions,
} from "@/store";
import { GameDataError } from "@/src/functions/generic/GameDataError";

/** Replays the server's play-in results (state.tournament.simulation). */
export const PlayPlayinGames = () => {
  const dispatch = useDispatch();

  const simulation = useSelector(
    (state: RootState) => state.tournament.simulation
  );

  useEffect(() => {
    if (!simulation) {
      throw new GameDataError("no tournament results", { phase: "playin" });
    }
    simulation.playin.forEach((result) => {
      const { gameIndex, winningTeam, seedType } = result;
      dispatch(
        tournamentPlayersPicksActions.replacePlayinPicksWithWinner({
          gameIndex,
          winningTeam,
          seedType,
        })
      );
      dispatch(tournamentActions.setPlayinGameResults(result));
    });
    dispatch(appStateActions.activateTournamentStandardGames());
  }, [dispatch, simulation]);

  return null;
};
