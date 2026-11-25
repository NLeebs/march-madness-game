"use client";
import React from "react";
import { useDispatch } from "react-redux";
import {
  appStateActions,
  uiStateActions,
  teamScheduleActions,
  regularSeasonRecordActions,
  tournamentPlayersPicksActions,
  tournamentActions,
  teamStatsActions,
} from "@/store";
import type { getYears } from "@/application/useCases";
import { apiGet } from "@/src/utils";
import type { ResultOf } from "./useApiQuery";

export const useRestartTheGame = () => {
  const dispatch = useDispatch();

  const restartTheGame = async () => {
    // Clear all game state
    dispatch(appStateActions.restartGame());
    dispatch(uiStateActions.restartGame());
    dispatch(teamScheduleActions.restartGame());
    dispatch(regularSeasonRecordActions.restartGame());
    dispatch(tournamentPlayersPicksActions.restartGame());
    dispatch(tournamentActions.restartGame());
    dispatch(teamStatsActions.restartGame());

    // Set default yearId to latest year to prevent empty state issues
    try {
      const years = await apiGet<ResultOf<typeof getYears>>("/api/years", "fetch years");
      if (years?.length > 0) {
        const latestYearId = years[years.length - 1].id;
        dispatch(tournamentActions.setYearId(latestYearId));
      }
    } catch (error) {
      console.error("Failed to set default year on restart:", error);
      // Don't throw - allow restart to continue even if year fetch fails
    }
  };
  return { restartTheGame };
};
