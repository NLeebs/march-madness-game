"use client"
// Libraries
import React from "react";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";
// Componenets
import BasketballSVG from "../Graphics/BasketballSVG";


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
      className={`relative rounded-full transition ease-out hover:scale-110`}
    >
      <div className={`absolute inset-0 w-full h-full z-10 rounded-full ${isLoading ? "bg-gray-200" : "bg-orange-500"} opacity-25`}>
      </div>
      <div className={`absolute inset-0 w-full h-full z-10 flex justify-center items-center rounded-full`}>
        <h2 className="text-7xl">
          {isLoading ? "Loading..." : "Start"}
        </h2>
      </div>
      <div className={`${isLoading && 'motion-safe:animate-spin'}`}>
        <BasketballSVG />
      </div>
    </button>);
}

export default StartButton;