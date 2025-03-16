"use client";
// Libraries
import React from "react";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// Functions
import findTeamConference from "@/src/functions/teamStatsData/findTeamConference";
//State
import { uiStateActions } from "@/store/uiStateSlice";
// Components
import Dialog from "../UI/Dialog";
import Image from "next/image";
import PlayerScore from "./PlayerScore";
import RestartGameButton from "../General/RestartGameButton";
// Constants
import { ACCENT_COLOR } from "@/src/constants";

// Component Function
function TournamentRecapDialog(props) {
  const dispatch = useDispatch();

  const isRecapDialogOpen = useSelector(
    (state) => state.uiState.isRecapDialogOpen
  );
  const teamStatsObject = useSelector((state) => state.teamStats.teamStats);
  const confArrs = useSelector((state) => state.teamStats.conferenceArrays);
  const championObj = useSelector(
    (state) => state.tournament.champion.champion[0][0]
  );
  const playerPickChampion = useSelector(
    (state) => state.tournamentPlayersPicks.picks.champion.champion[0][0].team
  );

  const onCloseRecapDialogHandler = () => {
    dispatch(uiStateActions.toggleRecapDialog());
  };

  // Get Champions Conference
  const champConf = findTeamConference(championObj.team, confArrs);

  // Get Champion's Team Color
  const championPrimaryColor =
    teamStatsObject[champConf][championObj.team]["primary-color"];

  // Get Champion's Logo
  const championLogo = teamStatsObject[champConf][championObj.team]["logo"];

  // JSX
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
}

export default TournamentRecapDialog;
