"use client"
// Libraries
import React from "react";
// Components
import StartButton from "./StartButton";


function StartScreen() {
 
  return (
  <div className="w-screen h-screen flex flex-col justify-center items-center">
    <h1>Madness</h1>
    <h2 className="pb-4">The Game</h2>
    <StartButton />
  </div>
  );
}

export default StartScreen;