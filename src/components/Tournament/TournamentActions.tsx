"use client";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, uiStateActions } from "@/store";
import { Button, PlayerScore, RestartGameButton } from "@/src/components";
import { PRIMARY_COLOR } from "@/src/constants";

/** The post-tournament actions: the player's score, See Recap and Play Again. */
export const TournamentActions: React.FC = () => {
  const dispatch = useDispatch();
  const appState = useSelector((state: RootState) => state.appState);

  const showTournamentRecapButtonHandler = () => {
    dispatch(uiStateActions.toggleRecapDialog());
  };

  return (
    <div
      data-testid="tournament-actions"
      className="flex flex-col justify-start items-center gap-4 mb-4"
    >
      {appState.tournamentPlayGames && <PlayerScore />}
      {appState.tournamentRecap && (
        <Button
          onClick={showTournamentRecapButtonHandler}
          text="See Recap"
          backgroundColor={PRIMARY_COLOR}
        />
      )}
      {appState.tournamentRecap && <RestartGameButton />}
    </div>
  );
};
