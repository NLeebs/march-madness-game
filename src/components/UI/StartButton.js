"use client"
// Libraries
import React from "react";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";


// Component Function
function StartButton() {
  const dispatch = useDispatch();

  const isLoading = useSelector((state) => state.appState.loading);

  const activateRegularSeason = () => {
    dispatch(appStateActions.activateRegularSeason())
  }

  return (
    <button 
      onClick={activateRegularSeason}
      disabled={isLoading}
      className={`${isLoading && "bg-gray-200"}`}
    >
      {isLoading ? "Loading..." : "Start!"}
    </button>);
}

export default StartButton;