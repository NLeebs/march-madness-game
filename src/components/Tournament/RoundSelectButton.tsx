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
  XXXL_LARGE_BREAK_POINT,
  XXL_LARGE_BREAK_POINT,
  XL_LARGE_BREAK_POINT,
  LARGE_BREAK_POINT,
  MEDIUM_BREAK_POINT,
  TOURNAMENT_ROUND_COLUMN_WIDTH,
  TOURNAMENT_ROUND_BUTTON_WITH_BACK_BUTTON_WIDTH,
  NON_CTA_BUTTON_COLOR,
} from "@/src/constants";
import { TournamentRound } from "@/types";

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

  let roundSelectButtonWidth: number | string,
    roundSelectButtonTextColor: string,
    roundSelectButtonFontSize: number;
  const setButtonShrinkStyles = () => {
    roundSelectButtonWidth = 0;
    roundSelectButtonTextColor = NON_CTA_BUTTON_COLOR;
    roundSelectButtonFontSize = 0;
  };
  const setButtonDefaultStyles = () => {
    roundSelectButtonWidth = TOURNAMENT_ROUND_BUTTON_WITH_BACK_BUTTON_WIDTH;
  };

  if (
    screenWidth <= XXXL_LARGE_BREAK_POINT &&
    screenWidth > XXL_LARGE_BREAK_POINT
  ) {
    if (
      (selectedRound === 2 ||
        selectedRound === "sweet sixteen" ||
        selectedRound === "elite eight" ||
        selectedRound === "final four" ||
        selectedRound === "finals") &&
      round === 1
    ) {
      setButtonShrinkStyles();
    } else if (
      (selectedRound === 2 ||
        selectedRound === "sweet sixteen" ||
        selectedRound === "elite eight" ||
        selectedRound === "final four" ||
        selectedRound === "finals") &&
      round === 2
    ) {
      setButtonDefaultStyles();
    }
  } else if (
    screenWidth <= XXL_LARGE_BREAK_POINT &&
    screenWidth > XL_LARGE_BREAK_POINT
  ) {
    if (
      ((selectedRound === 2 && round !== 2) ||
        selectedRound === "sweet sixteen" ||
        selectedRound === "elite eight" ||
        selectedRound === "final four" ||
        selectedRound === "finals") &&
      (round === 1 || round === 2)
    ) {
      setButtonShrinkStyles();
    } else if (
      (selectedRound === 2 && round === 2) ||
      ((selectedRound === "sweet sixteen" ||
        selectedRound === "elite eight" ||
        selectedRound === "final four" ||
        selectedRound === "finals") &&
        round === "sweet sixteen")
    ) {
      setButtonDefaultStyles();
    }
  } else if (
    screenWidth <= XL_LARGE_BREAK_POINT &&
    screenWidth > LARGE_BREAK_POINT
  ) {
    if (
      ((selectedRound === 2 && round !== 2 && round !== "sweet sixteen") ||
        (selectedRound === "sweet sixteen" && round !== "sweet sixteen") ||
        selectedRound === "elite eight" ||
        selectedRound === "final four" ||
        selectedRound === "finals") &&
      (round === 1 || round === 2 || round === "sweet sixteen")
    ) {
      setButtonShrinkStyles();
    } else if (
      (selectedRound === 2 && round === 2) ||
      (selectedRound === "sweet sixteen" && round === "sweet sixteen") ||
      ((selectedRound === "elite eight" ||
        selectedRound === "final four" ||
        selectedRound === "finals") &&
        round === "elite eight")
    ) {
      setButtonDefaultStyles();
    }
  } else if (
    screenWidth <= LARGE_BREAK_POINT &&
    screenWidth > MEDIUM_BREAK_POINT
  ) {
    if (
      ((selectedRound === 2 &&
        round !== 2 &&
        round !== "sweet sixteen" &&
        round !== "elite eight") ||
        (selectedRound === "sweet sixteen" &&
          round !== "sweet sixteen" &&
          round !== "elite eight") ||
        (selectedRound === "elite eight" && round !== "elite eight") ||
        selectedRound === "final four" ||
        selectedRound === "finals") &&
      (round === 1 ||
        round === 2 ||
        round === "sweet sixteen" ||
        round === "elite eight")
    ) {
      setButtonShrinkStyles();
    } else if (
      (selectedRound === 2 && round === 2) ||
      (selectedRound === "sweet sixteen" && round === "sweet sixteen") ||
      (selectedRound === "elite eight" && round === "elite eight") ||
      ((selectedRound === "final four" || selectedRound === "finals") &&
        round === "final four")
    ) {
      setButtonDefaultStyles();
    }
  } else if (screenWidth <= MEDIUM_BREAK_POINT) {
    if (
      ((selectedRound === 2 &&
        round !== 2 &&
        round !== "sweet sixteen" &&
        round !== "elite eight" &&
        round !== "final four") ||
        (selectedRound === "sweet sixteen" &&
          round !== "sweet sixteen" &&
          round !== "elite eight" &&
          round !== "final four") ||
        (selectedRound === "elite eight" &&
          round !== "elite eight" &&
          round !== "final four") ||
        (selectedRound === "final four" && round !== "final four") ||
        selectedRound === "finals") &&
      (round === 1 ||
        round === 2 ||
        round === "sweet sixteen" ||
        round === "elite eight" ||
        round === "final four")
    ) {
      setButtonShrinkStyles();
    } else if (
      (selectedRound === 2 && round === 2) ||
      (selectedRound === "sweet sixteen" && round === "sweet sixteen") ||
      (selectedRound === "elite eight" && round === "elite eight") ||
      (selectedRound === "final four" && round === "final four") ||
      (selectedRound === "finals" && round === "finals")
    ) {
      setButtonDefaultStyles();
    }
  } else {
    setButtonDefaultStyles();
  }

  // Ping Notifcation logic
  let isAllRoundPicksSelected;
  const checkIfPicksWereMade = (roundPicksIndex) => {
    return Object.keys(playerPicksObj[roundPicksIndex]).every((region) => {
      return playerPicksObj[roundPicksIndex][region].every((matchup) => {
        return matchup.every((team) => {
          return team.team !== "";
        });
      });
    });
  };

  let playerPicksRoundIndex;
  if (round === 2) playerPicksRoundIndex = "roundTwoPicks";
  else if (round === "sweet sixteen")
    playerPicksRoundIndex = "roundSweetSixteenPicks";
  else if (round === "elite eight")
    playerPicksRoundIndex = "roundEliteEightPicks";
  else if (round === "final four")
    playerPicksRoundIndex = "roundFinalFourPicks";
  else if (round === "finals")
    playerPicksRoundIndex = ["roundFinalsPicks", "champion"];

  if (round === "finals") {
    isAllRoundPicksSelected = playerPicksRoundIndex.every((round) => {
      return checkIfPicksWereMade(round);
    });
  } else if (round !== 1) {
    isAllRoundPicksSelected = checkIfPicksWereMade(playerPicksRoundIndex);
  } else {
    isAllRoundPicksSelected = false;
  }

  //JSX
  return (
    <motion.button
      onClick={roundSelectHandler}
      initial={{
        width: TOURNAMENT_ROUND_COLUMN_WIDTH,
        color: PRIMARY_TEXT_COLOR,
        fontSize: DEFAULT_FONT_SIZE,
      }}
      animate={{
        width: roundSelectButtonWidth,
        color: roundSelectButtonTextColor,
        fontSize: roundSelectButtonFontSize,
      }}
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
        className="absolute bottom-0 left-1/2 origin-left w-full h-1"
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
