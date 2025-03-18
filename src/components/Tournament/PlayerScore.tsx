"use client";
import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  ACCENT_COLOR,
  NON_CTA_BUTTON_COLOR,
  CONFIRMATION_GREEN,
} from "@/src/constants";

export const PlayerScore = () => {
  const playerScore = useSelector(
    (state: RootState) => state.tournament.playerScore
  );

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
};
