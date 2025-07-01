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

  const teamStats = useSelector(
    (state: RootState) => state.teamStats.teamStats
  );

  const restartButtonClickHandler = (): void => {
    dispatch(appStateActions.restartGame());
    dispatch(uiStateActions.restartGame());
    dispatch(teamScheduleActions.restartGame());
    dispatch(regularSeasonRecordActions.restartGame());
    dispatch(tounramentPlayersPicksActions.restartGame());
    dispatch(tournamentActions.restartGame());

    Promise.all([delay(TIMER_BETWEEN_APP_STATES)]).then(() => {
      dispatch(teamScheduleActions.teamScheduleConfig(teamStats));
      dispatch(regularSeasonRecordActions.regularSeasonRecordConfig(teamStats));
    });
  };

  return (
    <Button
      onClick={restartButtonClickHandler}
      text={"Play Again"}
      backgroundColor={PRIMARY_COLOR}
    />
  );
};
