"use client";
import React from "react";
import { useSelector } from "react-redux";
import { TournamentMatchup } from "@/src/components";
import { motion } from "framer-motion";
import { TOURNAMENT_BREAK_POINT } from "@/src/constants";
import {
  getRoundSpacing,
  ROUND_STATE_KEYS,
  showsResults,
} from "@/src/functions/tournament";
import type {
  TournamentRound as TournamentRoundType,
  TournamentRegion,
  TournamentRoundMatchups,
  TournamentMatchup as TournamentMatchupType,
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
  const { matchupsKey, picksKey } = ROUND_STATE_KEYS[round];

  const appState = useSelector((state: RootState) => state.appState);
  const screenWidth = useSelector(
    (state: RootState) => state.uiState.screenWidth
  );
  const selectedRound = useSelector(
    (state: RootState) => state.uiState.selectedRound
  );
  const matchupObj = useSelector(
    (state: RootState) => state.tournament[matchupsKey]
  );
  const playerPicksObj = useSelector(
    (state: RootState) => state.tournamentPlayersPicks.picks[picksKey]
  );

  const spacing = getRoundSpacing(roundUIPosition, selectedRound, screenWidth);

  let matchupElGenerationArr: TournamentRoundMatchups | RegionPicks;
  if (showsResults(round, appState)) {
    matchupElGenerationArr = matchupObj as TournamentRoundMatchups;
  } else {
    matchupElGenerationArr = playerPicksObj;
  }

  let tournamentMatchupElements: JSX.Element[] = [];

  const isPlayinMatchup = (
    matchupObj: unknown
  ): matchupObj is { playin: PlayinMatchup } => {
    if (typeof matchupObj !== "object" || matchupObj === null) return false;
    if (!("playin" in matchupObj)) return false;
    const playin = (matchupObj as { playin: unknown }).playin;
    return (
      typeof playin === "object" &&
      playin !== null &&
      "elevenSeeds" in playin &&
      "sixteenSeeds" in playin
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
          key={`${region}-${matchup[0].team}-${matchup[1]?.team}-index-${i}`}
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
        rowGap: appState.tournamentPlayGames
          ? spacing.playGap
          : spacing.selectGap,
        paddingTop: appState.tournamentPlayGames
          ? spacing.playPaddingTop
          : spacing.selectPaddingTop,
        paddingBottom: appState.tournamentPlayGames
          ? spacing.playPaddingBottom
          : spacing.selectPaddingBottom,
      }}
      className={`flex m-4 ${getRoundClassName()}`}
    >
      {tournamentMatchupElements}
    </motion.div>
  );
};
