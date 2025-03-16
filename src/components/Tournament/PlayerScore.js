"use client";
// Libraries
import React from "react";
// React Functions
import { useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";
// Constants
import {
  ACCENT_COLOR,
  NON_CTA_BUTTON_COLOR,
  CONFIRMATION_GREEN,
} from "@/src/constants";

// Component Function
function PlayerScore() {
  const playerScore = useSelector((state) => state.tournament.playerScore);

  const activateRegularSeason = () => {
    dispatch(appStateActions.activateRegularSeason());
  };

  return (
    <div
      className="p-8 rounded-full border-solid border-2"
      style={{
        backgroundColor: CONFIRMATION_GREEN,
        color: NON_CTA_BUTTON_COLOR,
        borderColor: ACCENT_COLOR,
      }}
    >
      <div className="text-center text-2xl">Score</div>
      <div className="text-center text-xl">{playerScore}</div>
    </div>
  );
}

export default PlayerScore;
