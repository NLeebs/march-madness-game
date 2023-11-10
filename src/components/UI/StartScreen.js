"use client"
// Libraries
import React from "react";
// React Functions
import { useSelector } from "react-redux";
// Components
import StartButton from "./StartButton";


function StartScreen() {
  const appState = useSelector((state) => state.appState);
//TODO: basketball starts small on desktop and grows big with state change. Eliminate flash
  return (
  <div className="w-screen h-screen overflow-hidden flex flex-col justify-center items-center">
    <div className={`flex flex-col items-center transition-opacity duration-500 ${appState.transition && 'opacity-0'}`}>
      <h1>Madness</h1>
      <h2 className="pb-4">The Game</h2>
    </div>
    <StartButton />
  </div>
  );
}

export default StartScreen;