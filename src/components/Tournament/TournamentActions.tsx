"use client";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, uiStateActions } from "@/store";
import { Button, PlayerScore, RestartGameButton } from "@/src/components";
import { PRIMARY_COLOR } from "@/src/constants";

/**
 * The tournament actions: the player's score (shown from the main-bracket replay on), then See
 * Recap and Play Again. The two buttons take their space from the start of that replay but stay
 * hidden until the recap, so the block doesn't grow (pushing the bracket down) when it ends.
 */
export const TournamentActions: React.FC = () => {
  const dispatch = useDispatch();
  const appState = useSelector((state: RootState) => state.appState);
  const started = appState.tournamentPlayGames || appState.tournamentRecap;
  const buttonsHidden = !appState.tournamentRecap;

  const showTournamentRecapButtonHandler = () => {
    dispatch(uiStateActions.toggleRecapDialog());
  };

  return (
    <div
      data-testid="tournament-actions"
      className="flex flex-col justify-start items-center gap-4 mb-4"
    >
      {appState.tournamentPlayGames && <PlayerScore />}
      {started && (
        <div
          aria-hidden={buttonsHidden ? true : undefined}
          className={`flex flex-col justify-start items-center gap-4${buttonsHidden ? " invisible" : ""}`}
        >
          <Button
            onClick={showTournamentRecapButtonHandler}
            text="See Recap"
            backgroundColor={PRIMARY_COLOR}
          />
          <RestartGameButton />
        </div>
      )}
    </div>
  );
};
