"use client";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  appStateActions,
  uiStateActions,
  teamScheduleActions,
  regularSeasonRecordActions,
  tounramentPlayersPicksActions,
  tournamentActions,
} from "@/store";
import { delay } from "@/src/functions";
import { TIMER_BETWEEN_APP_STATES } from "@/src/constants";

export const useRestartTheGame = () => {
  const dispatch = useDispatch();
  const teamStats = useSelector(
    (state: RootState) => state.teamStats.teamStats
  );

  const restartTheGame = async () => {
    dispatch(appStateActions.restartGame());
    dispatch(uiStateActions.restartGame());
    dispatch(teamScheduleActions.restartGame());
    dispatch(regularSeasonRecordActions.restartGame());
    dispatch(tounramentPlayersPicksActions.restartGame());
    dispatch(tournamentActions.restartGame());

    await Promise.all([delay(TIMER_BETWEEN_APP_STATES)])
      .then(() => {
        dispatch(teamScheduleActions.teamScheduleConfig(teamStats));
        dispatch(
          regularSeasonRecordActions.regularSeasonRecordConfig(teamStats)
        );
      })
      .catch((error) => {
        console.error("Restart failed:", error);
      });
  };
  return { restartTheGame };
};
