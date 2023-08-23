"use client"
// Libraries
import React from "react";
// React Functions
import { useDispatch } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";


// Component Function
function StartButton() {
  const dispatch = useDispatch();
  const activateRegularSeason = () => {
    dispatch(appStateActions.activateRegularSeason())
  }

  return (<button onClick={activateRegularSeason}>Start!</button>);
}

export default StartButton;