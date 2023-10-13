"use client"
// Libraries
import React from "react";
// React Functions
import { useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";


// Component Function
function PlayerScore() {
  const playerScore = useSelector((state) => state.tournament.playerScore);

  const activateRegularSeason = () => {
    dispatch(appStateActions.activateRegularSeason())
  }

  return (
    <div>
        <div className="text-center text-lg">Score</div>
        <div className="text-center">{playerScore}</div>
    </div>
   )
}

export default PlayerScore;