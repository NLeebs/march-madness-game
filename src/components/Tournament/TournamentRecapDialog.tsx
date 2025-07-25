"use client";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { uiStateActions } from "@/store";
import { Dialog, PlayerScore, RestartGameButton } from "@/src/components";
import Image from "next/image";
import { findTeamConference } from "@/src/functions";
import { ACCENT_COLOR } from "@/src/constants";
import { RootState } from "@/store/store";

export const TournamentRecapDialog: React.FC = () => {
  const dispatch = useDispatch();

  const isRecapDialogOpen = useSelector(
    (state: RootState) => state.uiState.isRecapDialogOpen
  );
  const teamStatsObject = useSelector(
    (state: RootState) => state.teamStats.teamStats
  );
  const confArrs = useSelector(
    (state: RootState) => state.teamStats.conferenceArrays
  );
  const championObj = useSelector(
    (state: RootState) => state.tournament.champion.champion[0][0]
  );
  const playerPickChampion = useSelector(
    (state: RootState) =>
      state.tournamentPlayersPicks.picks.champion.champion[0][0].team
  );

  const onCloseRecapDialogHandler = () => {
    dispatch(uiStateActions.toggleRecapDialog());
  };

  const champConf = findTeamConference(championObj.team, confArrs);
  const championPrimaryColor =
    teamStatsObject[champConf][championObj.team]["primary-color"];
  const championLogo = teamStatsObject[champConf][championObj.team]["logo"];

  return (
    <Dialog
      isOpen={isRecapDialogOpen}
      onClose={onCloseRecapDialogHandler}
      backgroundColor={championPrimaryColor}
    >
      <h3 className="text-center" style={{ color: ACCENT_COLOR }}>
        We Have a New Champ
      </h3>
      <div className="flex flex-col justify-start items-center gap-4">
        <h4 style={{ color: ACCENT_COLOR }}>#{championObj.seed} Seed</h4>
        <div
          className="p-8 rounded-md"
          style={{ backgroundColor: ACCENT_COLOR }}
        >
          <Image
            src={championLogo}
            alt="Champion's Logo"
            width={200}
            height={200}
          />
        </div>
      </div>
      <h4 className="leading-7 text-center" style={{ color: ACCENT_COLOR }}>
        {championObj.team === playerPickChampion
          ? "And You're a Genius for Picking Them!"
          : `Not sure why you picked ${playerPickChampion}`}
      </h4>
      <PlayerScore />
      <RestartGameButton />
    </Dialog>
  );
};
