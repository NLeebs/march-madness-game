"use client";
import React from "react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { TournamentRound } from "@/types";
import { RootState, uiStateActions } from "@/store";
import { LeftChevronSVG } from "@/src/components";
import { NON_CTA_BUTTON_COLOR, XXXL_LARGE_BREAK_POINT } from "@/src/constants";

export const RoundSelectBackButton = () => {
  const dispatch = useDispatch();

  const screenWidth = useSelector(
    (state: RootState) => state.uiState.screenWidth
  );
  const selectedRound = useSelector(
    (state: RootState) => state.uiState.selectedRound
  );

  const roundSelectBackHandler = () => {
    let prevRound: TournamentRound;
    if (selectedRound === 2) prevRound = 1;
    else if (selectedRound === "sweet sixteen") prevRound = 2;
    else if (selectedRound === "elite eight") prevRound = "sweet sixteen";
    else if (selectedRound === "final four") prevRound = "elite eight";
    else if (selectedRound === "finals") prevRound = "final four";
    else prevRound = 1;

    dispatch(
      uiStateActions.selectRound({
        newRound: prevRound,
      })
    );
  };

  return (
    <div>
      {selectedRound !== 1 && screenWidth <= XXXL_LARGE_BREAK_POINT && (
        <motion.button
          onClick={roundSelectBackHandler}
          className="relative w-roundSelectBackButton h-16 flex justify-center items-center text-center"
          style={{ backgroundColor: NON_CTA_BUTTON_COLOR }}
        >
          <LeftChevronSVG />
        </motion.button>
      )}
    </div>
  );
};
