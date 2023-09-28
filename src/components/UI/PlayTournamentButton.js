"use client"
// Libraries
import React from "react";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";


// Component Function
function PlayTournamentButton() {
  const dispatch = useDispatch();

  // Change state to tourny play
  const activateTournamentPlay = () => {
    dispatch(appStateActions.activateTournamentPlayGamesState())
  }

  // Check to see if all picks are in
  const playerPicksObj = useSelector((state) => state.tounramentPlayersPicks)

  return (<button onClick={activateTournamentPlay}>Submit Picks</button>);
}

export default PlayTournamentButton;