"use client"
// Libraries
import React from "react";
// React Functions
import { useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";
// Constants
import { NON_CTA_BUTTON_COLOR, CONFIRMATION_GREEN } from "@/constants/CONSTANTS";


// Component Function
function PlayerScore() {
  const playerScore = useSelector((state) => state.tournament.playerScore);

  const activateRegularSeason = () => {
    dispatch(appStateActions.activateRegularSeason())
  }

  return (
    <div 
      className="p-8 rounded-full"
      style={{backgroundColor: CONFIRMATION_GREEN, color: NON_CTA_BUTTON_COLOR,}}
    >
        <div className="text-center text-2xl">Score</div>
        <div className="text-center text-xl">{playerScore}</div>
    </div>
   )
}

export default PlayerScore;