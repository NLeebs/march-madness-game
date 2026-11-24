"use client";
import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  ACCENT_COLOR,
  NON_CTA_BUTTON_COLOR,
  CONFIRMATION_GREEN,
} from "@/src/constants";

interface PlayerScoreProps {
  /** An invisible copy that only takes up space: leaves the test id off, so there's one score to find. */
  placeholder?: boolean;
}

export const PlayerScore: React.FC<PlayerScoreProps> = ({ placeholder = false }) => {
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
      <div className="text-center text-xl" data-testid={placeholder ? undefined : "player-score-value"}>{playerScore}</div>
    </div>
  );
};
