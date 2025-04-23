"use client";
import React from "react";
import { useSelector } from "react-redux";
import { TournamentMatchup } from "@/src/components";
import { motion } from "framer-motion";
import {
  TOURNAMENT_BREAK_POINT,
  XXXL_LARGE_BREAK_POINT,
  XXL_LARGE_BREAK_POINT,
  XL_LARGE_BREAK_POINT,
  LARGE_BREAK_POINT,
  MEDIUM_BREAK_POINT,
} from "@/src/constants";

export const TournamentRound = (props) => {
  // Determine which State to pull from
  let roundResultsName, playersPicksName;
  if (props.round === "playin") {
    roundResultsName = "roundOneMatchups";
    playersPicksName = "roundTwoPicks";
  } else if (props.round === "1") {
    roundResultsName = "roundOneMatchups";
    playersPicksName = "roundTwoPicks";
  } else if (props.round === "2") {
    roundResultsName = "roundTwoMatchups";
    playersPicksName = "roundTwoPicks";
  } else if (props.round === "sweet sixteen") {
    roundResultsName = "roundSweetSixteenMatchups";
    playersPicksName = "roundSweetSixteenPicks";
  } else if (props.round === "elite eight") {
    roundResultsName = "roundEliteEightMatchups";
    playersPicksName = "roundEliteEightPicks";
  } else if (props.round === "final four") {
    roundResultsName = "roundFinalFourMatchups";
    playersPicksName = "roundFinalFourPicks";
  } else if (props.round === "finals") {
    roundResultsName = "roundFinalsMatchups";
    playersPicksName = "roundFinalsPicks";
  } else if (props.round === "champion") {
    roundResultsName = "champion";
    playersPicksName = "champion";
  }

  // State
  const appState = useSelector((state) => state.appState);
  const screenWidth = useSelector((state) => state.uiState.screenWidth);
  const selectedRound = useSelector((state) => state.uiState.selectedRound);
  const matchupObj = useSelector((state) => state.tournament[roundResultsName]);
  const playerPicksObj = useSelector(
    (state) => state.tournamentPlayersPicks.picks[playersPicksName]
  );

  let roundSelectGap,
    roundSelectPaddingTop,
    roundSelectPaddingBottom,
    roundPlayGap,
    roundPlayPaddingTop,
    roundPlayPaddingBottom;
  if (props.roundUIPosition === 0 || props.roundUIPosition === 1) {
    roundSelectGap = "1rem";
    roundSelectPaddingTop = 0;
    roundSelectPaddingBottom = "3rem";
    roundPlayGap = "3rem";
    roundPlayPaddingTop = 0;
    roundPlayPaddingBottom = "4rem";
  } else if (props.roundUIPosition === 2) {
    roundSelectGap = "9rem";
    roundSelectPaddingTop = "4rem";
    roundSelectPaddingBottom = "7rem";
    roundPlayGap = "10.5rem";
    roundPlayPaddingTop = "3.75rem";
    roundPlayPaddingBottom = "7.75rem";

    if (selectedRound !== 1 && screenWidth <= XXXL_LARGE_BREAK_POINT) {
      roundPlayGap = "15.5rem";
      roundPlayPaddingTop = "6.5rem";
      roundPlayPaddingBottom = "10rem";
    }

    if (
      (selectedRound === "elite eight" ||
        selectedRound === "final four" ||
        selectedRound === "finals") &&
      screenWidth <= XL_LARGE_BREAK_POINT
    ) {
      roundSelectPaddingTop = "6rem";
      roundPlayPaddingTop = "7rem";
    }
  } else if (props.roundUIPosition === 3) {
    roundSelectGap = "25rem";
    roundSelectPaddingTop = "12rem";
    roundSelectPaddingBottom = "15rem";
    roundPlayGap = "30.5rem";
    roundPlayPaddingTop = "14rem";
    roundPlayPaddingBottom = "17rem";

    if (selectedRound !== 1 && screenWidth <= XXXL_LARGE_BREAK_POINT) {
      roundPlayGap = "18rem";
      roundPlayPaddingTop = "19rem";
      roundPlayPaddingBottom = "22.5rem";
    }

    if (
      selectedRound !== 1 &&
      selectedRound !== 2 &&
      screenWidth <= XXL_LARGE_BREAK_POINT
    ) {
      roundPlayPaddingTop = "20rem";
    }
  } else if (props.roundUIPosition === 4) {
    roundSelectGap = "25rem";
    roundSelectPaddingTop = "28rem";
    roundSelectPaddingBottom = "31rem";
    roundPlayGap = 0;
    roundPlayPaddingTop = "33.75rem";
    roundPlayPaddingBottom = "36.75rem";

    if (selectedRound !== 1 && screenWidth < XXXL_LARGE_BREAK_POINT) {
      roundPlayGap = "15.5rem";
      roundPlayPaddingTop = "44.5rem";
    }
  } else if (props.roundUIPosition === 5) {
    roundSelectGap = 0;
    roundSelectPaddingTop = roundSelectPaddingBottom = "62rem";
    roundPlayGap = 0;
    roundPlayPaddingTop = roundPlayPaddingBottom = "75rem";
  } else if (props.roundUIPosition === "finals") {
    if (selectedRound === 1 || screenWidth > XXXL_LARGE_BREAK_POINT) {
      roundSelectGap = 0;
      roundSelectPaddingTop =
        screenWidth > TOURNAMENT_BREAK_POINT ? "62rem" : "128rem";
      roundSelectPaddingBottom = 0;
      roundPlayGap = 0;
      roundPlayPaddingTop =
        screenWidth > TOURNAMENT_BREAK_POINT ? "75rem" : "157rem";
      roundPlayPaddingBottom = 0;
    } else if (selectedRound === 2 || screenWidth > XXL_LARGE_BREAK_POINT) {
      roundSelectGap = 0;
      roundSelectPaddingTop = "64rem";
      roundSelectPaddingBottom = 0;
      roundPlayGap = 0;
      roundPlayPaddingTop = "97rem";
      roundPlayPaddingBottom = 0;
    } else if (
      selectedRound === "sweet sixteen" ||
      screenWidth > XL_LARGE_BREAK_POINT
    ) {
      roundSelectGap = 0;
      roundSelectPaddingTop = "33rem";
      roundSelectPaddingBottom = 0;
      roundPlayGap = 0;
      roundPlayPaddingTop = "47rem";
      roundPlayPaddingBottom = 0;
    } else if (
      selectedRound === "elite eight" ||
      screenWidth > LARGE_BREAK_POINT
    ) {
      roundSelectGap = 0;
      roundSelectPaddingTop = "17rem";
      roundSelectPaddingBottom = 0;
      roundPlayGap = 0;
      roundPlayPaddingTop = "22rem";
      roundPlayPaddingBottom = 0;
    } else if (
      selectedRound === "final four" ||
      screenWidth > MEDIUM_BREAK_POINT
    ) {
      roundSelectGap = 0;
      roundSelectPaddingTop = "6rem";
      roundSelectPaddingBottom = 0;
      roundPlayGap = 0;
      roundPlayPaddingTop = "9rem";
      roundPlayPaddingBottom = 0;
    } else {
      roundSelectGap = "1rem";
      roundSelectPaddingTop = 0;
      roundSelectPaddingBottom = 0;
      roundPlayGap = "3rem";
      roundPlayPaddingTop = 0;
      roundPlayPaddingBottom = 0;
    }
  }

  // Pass Matchups to Matchup Component
  let matchupElGenerationArr;
  if (
    props.round === "playin" ||
    props.round === "1" ||
    (props.round === "2" && appState.tournamentPlayRoundTwo) ||
    (props.round === "sweet sixteen" && appState.tournamentPlaySweetSixteen) ||
    (props.round === "elite eight" && appState.tournamentPlayEliteEight) ||
    (props.round === "final four" && appState.tournamentPlayFinalFour) ||
    (props.round === "finals" && appState.tournamentPlayFinals) ||
    appState.tournamentRecap
  )
    matchupElGenerationArr = matchupObj;
  else matchupElGenerationArr = playerPicksObj;

  // Matchup Generation
  let tournamentMatchupElements;
  // Generate matchups for playin round
  if (props.round === "playin") {
    const tournamentMatchupElementsElevenSeeds =
      matchupElGenerationArr.playin.elevenSeeds.map((matchup, i) => {
        return (
          <TournamentMatchup
            key={i}
            index={i}
            region={props.region}
            round={props.round}
            matchup={matchup}
          />
        );
      });
    const tournamentMatchupElementsSixteenSeeds =
      matchupElGenerationArr.playin.sixteenSeeds.map((matchup, i) => {
        return (
          <TournamentMatchup
            key={i + 2}
            index={i}
            region={props.region}
            round={props.round}
            matchup={matchup}
          />
        );
      });
    tournamentMatchupElements = [
      ...tournamentMatchupElementsElevenSeeds,
      ...tournamentMatchupElementsSixteenSeeds,
    ];
  }
  // Generate Matchups for all other rounds
  else {
    tournamentMatchupElements = matchupElGenerationArr[props.region].map(
      (matchup, i) => {
        return (
          <TournamentMatchup
            key={i}
            index={i}
            region={props.region}
            round={props.round}
            matchup={matchup}
            playerpicks={playerPicksObj[props.region][i]}
          />
        );
      }
    );
  }

  // JSX
  return (
    <motion.div
      initial={false}
      animate={{
        rowGap: appState.tournamentPlayGames ? roundPlayGap : roundSelectGap,
        paddingTop: appState.tournamentPlayGames
          ? roundPlayPaddingTop
          : roundSelectPaddingTop,
        paddingBottom: appState.tournamentPlayGames
          ? roundPlayPaddingBottom
          : roundSelectPaddingBottom,
      }}
      className={`
                flex m-4
                ${
                  props.round === "playin"
                    ? `${
                        screenWidth > TOURNAMENT_BREAK_POINT
                          ? "flex-row justify-center gap-8"
                          : "flex-col"
                      }`
                    : "flex-col"
                } 
            `}
    >
      {tournamentMatchupElements}
    </motion.div>
  );
};
