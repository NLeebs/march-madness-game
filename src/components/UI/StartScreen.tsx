"use client";
import React from "react";
import { useSelector } from "react-redux";
import { StartButton } from "@/src/components/UI/StartButton";
import { RootState } from "@/store";

export const StartScreen = () => {
  const appState = useSelector((state: RootState) => state.appState);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col justify-center items-center">
      <div
        className={`flex flex-col items-center transition-opacity duration-500 ${
          appState.transition && "opacity-0"
        }`}
      >
        <h1>Madness</h1>
        <h2 className="pb-4">The Game</h2>
      </div>
      <StartButton />
    </div>
  );
};
