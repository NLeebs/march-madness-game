"use client";
import React from "react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { RootState, uiStateActions } from "@/store";
import { PingNotification } from "@/src/components";
import {
  PRIMARY_COLOR,
  PRIMARY_TEXT_COLOR,
  DEFAULT_FONT_SIZE,
  TOURNAMENT_ROUND_COLUMN_WIDTH,
  TOURNAMENT_ROUND_BUTTON_WITH_BACK_BUTTON_WIDTH,
  NON_CTA_BUTTON_COLOR,
} from "@/src/constants";
import {
  areRoundPicksComplete,
  getRoundButtonState,
  type RoundButtonState,
} from "@/src/functions/tournament";
import type { TournamentRound } from "@/types";

/**
 * The animate target per state. Only "shrink" sets the color and font size, so a button
 * that shrank and comes back keeps them.
 */
const BUTTON_ANIMATE: Record<
  RoundButtonState,
  { width?: number | string; color?: string; fontSize?: number }
> = {
  shrink: { width: 0, color: NON_CTA_BUTTON_COLOR, fontSize: 0 },
  default: { width: TOURNAMENT_ROUND_BUTTON_WITH_BACK_BUTTON_WIDTH },
  unchanged: {},
};

interface RoundSelectButtonProps {
  round: TournamentRound;
  buttonText: string;
}

export const RoundSelectButton: React.FC<RoundSelectButtonProps> = ({
  round,
  buttonText,
}) => {
  const dispatch = useDispatch();

  const playerPicksObj = useSelector(
    (state: RootState) => state.tournamentPlayersPicks.picks
  );
  const screenWidth = useSelector(
    (state: RootState) => state.uiState.screenWidth
  );
  const selectedRound = useSelector(
    (state: RootState) => state.uiState.selectedRound
  );

  const roundSelectHandler = () => {
    const roundSelectionBarEl = document.getElementById("roundSelectionBar");
    roundSelectionBarEl.scrollLeft = 0;

    dispatch(
      uiStateActions.selectRound({
        newRound: round,
      })
    );
  };

  let accentLineScale: number,
    accentLinePosition: string | number,
    accentLineBackgroundColor: string;
  if (round === selectedRound) {
    accentLineScale = 1;
    accentLinePosition = 0;
    accentLineBackgroundColor = PRIMARY_COLOR;
  } else {
    accentLineScale = 0;
    accentLinePosition = "50%";
    accentLineBackgroundColor = NON_CTA_BUTTON_COLOR;
  }

  const buttonAnimate =
    BUTTON_ANIMATE[getRoundButtonState(round, selectedRound, screenWidth)];
  const isAllRoundPicksSelected = areRoundPicksComplete(round, playerPicksObj);

  return (
    <motion.button
      onClick={roundSelectHandler}
      aria-current={round === selectedRound ? "true" : undefined}
      initial={{
        width: TOURNAMENT_ROUND_COLUMN_WIDTH,
        color: PRIMARY_TEXT_COLOR,
        fontSize: DEFAULT_FONT_SIZE,
      }}
      animate={buttonAnimate}
      className="relative h-16 flex justify-center items-center"
      style={{ backgroundColor: NON_CTA_BUTTON_COLOR }}
    >
      <div className="relative w-max px-5">
        {buttonText}
        {round !== 1 && isAllRoundPicksSelected && (
          <PingNotification icon="check" />
        )}
      </div>

      {/* Accent Bar */}
      <motion.div
        className="absolute bottom-0 left-1/2 origin-left w-full h-1 bg-slate-50"
        initial={{
          scaleX: 0,
          left: "50%",
          backgroundColor: "transparent",
        }}
        animate={{
          scaleX: accentLineScale,
          left: accentLinePosition,
          backgroundColor: accentLineBackgroundColor,
        }}
        transition={{ duration: 0.25 }}
      />
    </motion.button>
  );
};
