"use client";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  appStateActions,
  uiStateActions,
  teamScheduleActions,
  regularSeasonRecordActions,
  tounramentPlayersPicksActions,
  tournamentActions,
} from "@/store";
import { Button } from "@/src/components";
import { delay } from "@/src/functions";
import { PRIMARY_COLOR, TIMER_BETWEEN_APP_STATES } from "@/src/constants";
import { RootState } from "@/store";

export const RestartGameButton: React.FC = () => {
  const dispatch = useDispatch();
  const [isRestarting, setIsRestarting] = React.useState(false);

  const teamStats = useSelector(
    (state: RootState) => state.teamStats.teamStats
  );

  const restartButtonClickHandler = (): void => {
    if (isRestarting) return;

    setIsRestarting(true);

    dispatch(appStateActions.restartGame());
    dispatch(uiStateActions.restartGame());
    dispatch(teamScheduleActions.restartGame());
    dispatch(regularSeasonRecordActions.restartGame());
    dispatch(tounramentPlayersPicksActions.restartGame());
    dispatch(tournamentActions.restartGame());

    Promise.all([delay(TIMER_BETWEEN_APP_STATES)])
      .then(() => {
        dispatch(teamScheduleActions.teamScheduleConfig(teamStats));
        dispatch(
          regularSeasonRecordActions.regularSeasonRecordConfig(teamStats)
        );
        setIsRestarting(false);
      })
      .catch((error) => {
        console.error("Restart failed:", error);
        setIsRestarting(false);
      });
  };

  return (
    <Button
      onClick={restartButtonClickHandler}
      text={isRestarting ? "Restarting..." : "Play Again"}
      backgroundColor={PRIMARY_COLOR}
      disabled={isRestarting}
    />
  );
};
