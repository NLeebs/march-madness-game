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
import type {
  TournamentRound as TournamentRoundType,
  TournamentRegion,
  TournamentRoundMatchups,
  TournamentMatchup as TournamentMatchupType,
  TournamentPlayerPickRound,
  RegionPicks,
  PlayinMatchup,
} from "@/types";
import type { RootState } from "@/store";

interface TournamentRoundProps {
  round: TournamentRoundType | "playin";
  region: TournamentRegion;
  roundUIPosition?: number | "finals";
}

export const TournamentRound: React.FC<TournamentRoundProps> = ({
  round,
  region,
  roundUIPosition,
}) => {
  let roundResultsName: keyof RootState["tournament"];
  let playersPicksName: TournamentPlayerPickRound;

  if (round === "playin" || round === 1) {
    roundResultsName = "roundOneMatchups";
    playersPicksName = "roundTwoPicks";
  } else if (round === 2) {
    roundResultsName = "roundTwoMatchups";
    playersPicksName = "roundTwoPicks";
  } else if (round === "sweet sixteen") {
    roundResultsName = "roundSweetSixteenMatchups";
    playersPicksName = "roundSweetSixteenPicks";
  } else if (round === "elite eight") {
    roundResultsName = "roundEliteEightMatchups";
    playersPicksName = "roundEliteEightPicks";
  } else if (round === "final four") {
    roundResultsName = "roundFinalFourMatchups";
    playersPicksName = "roundFinalFourPicks";
  } else if (round === "finals") {
    roundResultsName = "roundFinalsMatchups";
    playersPicksName = "roundFinalsPicks";
  } else if (round === "champion") {
    roundResultsName = "champion";
    playersPicksName = "champion";
  }

  const appState = useSelector((state: RootState) => state.appState);
  const screenWidth = useSelector(
    (state: RootState) => state.uiState.screenWidth
  );
  const selectedRound = useSelector(
    (state: RootState) => state.uiState.selectedRound
  );
  const matchupObj = useSelector(
    (state: RootState) => state.tournament[roundResultsName]
  );
  const playerPicksObj = useSelector(
    (state: RootState) => state.tournamentPlayersPicks.picks[playersPicksName]
  );

  let roundSelectGap: string,
    roundSelectPaddingTop: string,
    roundSelectPaddingBottom: string,
    roundPlayGap: string,
    roundPlayPaddingTop: string,
    roundPlayPaddingBottom: string;

  if (roundUIPosition === 0 || roundUIPosition === 1) {
    roundSelectGap = "1rem";
    roundSelectPaddingTop = "0";
    roundSelectPaddingBottom = "3rem";
    roundPlayGap = "3rem";
    roundPlayPaddingTop = "0";
    roundPlayPaddingBottom = "4rem";
  } else if (roundUIPosition === 2) {
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
  } else if (roundUIPosition === 3) {
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
  } else if (roundUIPosition === 4) {
    roundSelectGap = "25rem";
    roundSelectPaddingTop = "28rem";
    roundSelectPaddingBottom = "31rem";
    roundPlayGap = "0";
    roundPlayPaddingTop = "33.75rem";
    roundPlayPaddingBottom = "36.75rem";

    if (selectedRound !== 1 && screenWidth < XXXL_LARGE_BREAK_POINT) {
      roundPlayGap = "15.5rem";
      roundPlayPaddingTop = "44.5rem";
    }
  } else if (roundUIPosition === 5) {
    roundSelectGap = "0";
    roundSelectPaddingTop = roundSelectPaddingBottom = "62rem";
    roundPlayGap = "0";
    roundPlayPaddingTop = roundPlayPaddingBottom = "75rem";
  } else if (roundUIPosition === "finals") {
    if (selectedRound === 1 || screenWidth > XXXL_LARGE_BREAK_POINT) {
      roundSelectGap = "0";
      roundSelectPaddingTop =
        screenWidth > TOURNAMENT_BREAK_POINT ? "62rem" : "128rem";
      roundSelectPaddingBottom = "0";
      roundPlayGap = "0";
      roundPlayPaddingTop =
        screenWidth > TOURNAMENT_BREAK_POINT ? "75rem" : "157rem";
      roundPlayPaddingBottom = "0";
    } else if (selectedRound === 2 || screenWidth > XXL_LARGE_BREAK_POINT) {
      roundSelectGap = "0";
      roundSelectPaddingTop = "64rem";
      roundSelectPaddingBottom = "0";
      roundPlayGap = "0";
      roundPlayPaddingTop = "97rem";
      roundPlayPaddingBottom = "0";
    } else if (
      selectedRound === "sweet sixteen" ||
      screenWidth > XL_LARGE_BREAK_POINT
    ) {
      roundSelectGap = "0";
      roundSelectPaddingTop = "33rem";
      roundSelectPaddingBottom = "0";
      roundPlayGap = "0";
      roundPlayPaddingTop = "47rem";
      roundPlayPaddingBottom = "0";
    } else if (
      selectedRound === "elite eight" ||
      screenWidth > LARGE_BREAK_POINT
    ) {
      roundSelectGap = "0";
      roundSelectPaddingTop = "17rem";
      roundSelectPaddingBottom = "0";
      roundPlayGap = "0";
      roundPlayPaddingTop = "22rem";
      roundPlayPaddingBottom = "0";
    } else if (
      selectedRound === "final four" ||
      screenWidth > MEDIUM_BREAK_POINT
    ) {
      roundSelectGap = "0";
      roundSelectPaddingTop = "6rem";
      roundSelectPaddingBottom = "0";
      roundPlayGap = "0";
      roundPlayPaddingTop = "9rem";
      roundPlayPaddingBottom = "0";
    } else {
      roundSelectGap = "1rem";
      roundSelectPaddingTop = "0";
      roundSelectPaddingBottom = "0";
      roundPlayGap = "3rem";
      roundPlayPaddingTop = "0";
      roundPlayPaddingBottom = "0";
    }
  }

  let matchupElGenerationArr: TournamentRoundMatchups | RegionPicks;
  if (
    round === "playin" ||
    round === 1 ||
    (round === 2 && appState.tournamentPlayRoundTwo) ||
    (round === "sweet sixteen" && appState.tournamentPlaySweetSixteen) ||
    (round === "elite eight" && appState.tournamentPlayEliteEight) ||
    (round === "final four" && appState.tournamentPlayFinalFour) ||
    (round === "finals" && appState.tournamentPlayFinals) ||
    appState.tournamentRecap
  ) {
    matchupElGenerationArr = matchupObj as TournamentRoundMatchups;
  } else {
    matchupElGenerationArr = playerPicksObj;
  }

  let tournamentMatchupElements: JSX.Element[] = [];

  const isPlayinMatchup = (
    matchupObj: any
  ): matchupObj is { playin: PlayinMatchup } => {
    return (
      matchupObj &&
      "playin" in matchupObj &&
      matchupObj.playin &&
      "elevenSeeds" in matchupObj.playin &&
      "sixteenSeeds" in matchupObj.playin
    );
  };

  if (round === "playin" && isPlayinMatchup(matchupElGenerationArr)) {
    const playinMatchup = matchupElGenerationArr.playin;
    const tournamentMatchupElementsElevenSeeds = playinMatchup.elevenSeeds.map(
      (matchup, i) => (
        <TournamentMatchup
          key={`playin-eleven-${matchup[0].team}-${matchup[1].team}`}
          index={i}
          region={region}
          round={round}
          matchup={matchup}
        />
      )
    );

    const tournamentMatchupElementsSixteenSeeds =
      playinMatchup.sixteenSeeds.map((matchup, i) => (
        <TournamentMatchup
          key={`playin-sixteen-${matchup[0].team}-${matchup[1].team}`}
          index={i}
          region={region}
          round={round}
          matchup={matchup}
        />
      ));

    tournamentMatchupElements = [
      ...tournamentMatchupElementsElevenSeeds,
      ...tournamentMatchupElementsSixteenSeeds,
    ];
  } else if (region in matchupElGenerationArr) {
    tournamentMatchupElements = matchupElGenerationArr[region].map(
      (matchup: TournamentMatchupType, i: number) => (
        <TournamentMatchup
          key={`${region}-${matchup[0].team}-${matchup[1]?.team}`}
          index={i}
          region={region}
          round={round}
          matchup={matchup}
          playerPicks={playerPicksObj?.[region]?.[i]}
        />
      )
    );
  }

  const getRoundClassName = () => {
    if (round === "playin") {
      return screenWidth > TOURNAMENT_BREAK_POINT
        ? "flex-row justify-center gap-8"
        : "flex-col";
    }
    return "flex-col";
  };

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
      className={`flex m-4 ${getRoundClassName()}`}
    >
      {tournamentMatchupElements}
    </motion.div>
  );
};
