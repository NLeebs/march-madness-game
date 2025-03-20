"use client";
import React from "react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
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
    let prevRound: string;
    if (selectedRound === "round2") prevRound = "round1";
    else if (selectedRound === "sweetSixteen") prevRound = "round2";
    else if (selectedRound === "eliteEight") prevRound = "sweetSixteen";
    else if (selectedRound === "finalFour") prevRound = "eliteEight";
    else if (selectedRound === "finals") prevRound = "finalFour";
    else prevRound = "round1";

    dispatch(
      uiStateActions.selectRound({
        newRound: prevRound,
      })
    );
  };

  return (
    <div>
      {selectedRound !== "round1" && screenWidth <= XXXL_LARGE_BREAK_POINT && (
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
