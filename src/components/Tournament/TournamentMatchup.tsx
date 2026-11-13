"use client";
import React, { useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import type {
  TournamentMatchup as TournmentMatchupType,
  TournamentRegion,
  TournamentRound,
} from "@/types";
import { RootState, tounramentPlayersPicksActions } from "@/store";
import { TournamentMatchupCard } from "@/src/components";
import { findTeamConference } from "@/src/functions";
import {
  ALL_PLAYIN_PLACEHOLDERS,
  ROUND_CONFIG,
} from "@/src/functions/tournament/roundConfig";
import {
  NON_CTA_BUTTON_COLOR,
  TOURAMENT_CHAMPION_RIBBON_HEIGHT,
} from "@/src/constants";

interface TournamentMatchupProps {
  round: TournamentRound | "playin";
  region: TournamentRegion;
  index: number;
  matchup: TournmentMatchupType;
  playerPicks?: any;
}

interface NextRoundInfo {
  nextRoundRegion: TournamentRegion;
  teamIndex: number;
}

/** Where the winner of this game goes in the next round. */
export const getNextRoundInfo = (
  round: TournamentRound | "playin",
  region: TournamentRegion,
  index: number
): NextRoundInfo => {
  if (round !== "playin" && round !== "champion") {
    const next = ROUND_CONFIG[round].advance[region];
    if (next) return { nextRoundRegion: next.region, teamIndex: next.teamIndex };
  }
  return { nextRoundRegion: region, teamIndex: index };
};

const getChampionStyles = (
  round: TournamentRound | "playin",
  matchup: TournmentMatchupType,
  confArrs: any,
  teamStatsObject: any
) => {
  if (round !== "champion" || !matchup[0].team) {
    return {
      teamBarHeight: "auto",
      teamBarColor: NON_CTA_BUTTON_COLOR,
    };
  }

  if (ALL_PLAYIN_PLACEHOLDERS.includes(matchup[0].team)) {
    return {
      teamBarHeight: TOURAMENT_CHAMPION_RIBBON_HEIGHT,
      teamBarColor: NON_CTA_BUTTON_COLOR,
    };
  }

  const teamConf = findTeamConference(matchup[0].team, confArrs);
  const championPrimaryColor =
    teamStatsObject[teamConf][matchup[0].team]["primary-color"];

  return {
    teamBarHeight: TOURAMENT_CHAMPION_RIBBON_HEIGHT,
    teamBarColor: championPrimaryColor,
  };
};

export const TournamentMatchup: React.FC<TournamentMatchupProps> = ({
  round,
  region,
  index,
  matchup,
  playerPicks,
}) => {
  const dispatch = useDispatch();
  const teamStatsObject = useSelector(
    (state: RootState) => state.teamStats.teamStats
  );
  const confArrs = useSelector(
    (state: RootState) => state.teamStats.conferenceArrays
  );

  const { nextRoundRegion, teamIndex } = getNextRoundInfo(round, region, index);
  const { teamBarHeight, teamBarColor } = getChampionStyles(
    round,
    matchup,
    confArrs,
    teamStatsObject
  );

  const teamSelectionClickHandler = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const teamEl = (e.target as HTMLElement).closest(
        "button.team-selection"
      ) as HTMLButtonElement;
      if (!teamEl || round === "playin") return;

      const opponentValue = teamEl.dataset.value === "0" ? "1" : "0";
      const opponentEl = teamEl
        .closest("div.matchup-container")
        ?.querySelector(
          `button.team-selection[data-value="${opponentValue}"]`
        ) as HTMLButtonElement;

      if (!opponentEl) return;

      dispatch(
        tounramentPlayersPicksActions.setPick({
          round,
          region: nextRoundRegion,
          roundIndex: teamIndex,
          team: teamEl.dataset.team,
          seed: teamEl.dataset.seed,
          opponent: opponentEl.dataset.team,
        })
      );
    },
    [dispatch, nextRoundRegion, round, teamIndex]
  );

  const matchupElements = matchup.map((teamObj, i) => (
    <TournamentMatchupCard
      key={`${round}-${region}-${index}-${i}`}
      round={round}
      region={region}
      index={index}
      matchup={matchup}
      matchupIndex={i}
      matchupTeam={teamObj}
      teamBarHeight={teamBarHeight}
      teamBarColor={teamBarColor}
      teamClickHandler={teamSelectionClickHandler}
      playerPicks={playerPicks}
    />
  ));

  return (
    <div
      className="matchup-container w-teamBar"
      style={{ backgroundColor: NON_CTA_BUTTON_COLOR }}
    >
      {matchupElements}
    </div>
  );
};
