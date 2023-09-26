"use client"
// Libraries
import React from "react";
// React Functions
import { useSelector } from "react-redux";
// Functions
import findTeamConference from "@/src/functions/teamStatsData/findTeamConference";
// CSS Styles
import styles from './TeamBar.module.css';
// Components
import Image from "next/image";


// Component Function
function TeamBar(props) {
  const appState = useSelector((state) => state.appState);
  const teamStats = useSelector((state) => state.teamStats.teamStats);
  const confArrs = useSelector((state) => state.teamStats.conferenceArrays);
  const regularSeasonRecords = useSelector((state) => state.regularSeasonRecords.records);
  const tournamentTeamsArr = useSelector((state) => state.tournament.tournamentTeams);
  const playinTeamsObj = useSelector((state) => state.tournament.playinTeams);

  // Find conference of the team
  const teamConf = findTeamConference(props.team, confArrs);

  // Check if this is a playin Game and pull logo for non-playin games
  let isPlayin;
  let teamLogoPath;
  if (props.team === "playinGameSeed11Game1" || props.team === "playinGameSeed11Game2" || props.team === "playinGameSeed16Game1" || props.team === "playinGameSeed16Game2") {
      isPlayin = true;
  } else {
      isPlayin = false;
      teamLogoPath = teamStats[teamConf][props.team].logo;
  }

  // Dynamic Styles
  let teamBarclasses = "";
  if(tournamentTeamsArr && appState.selectionSunday && (tournamentTeamsArr.includes(props.team) || playinTeamsObj.elevenSeeds.includes(props.team) || playinTeamsObj.sixteenSeeds.includes(props.team))) teamBarclasses = styles.goingToTheDance;

  return (
    <div className={teamBarclasses}>
        <div className="flex flex-row justify-between items-center gap-4">
          {isPlayin || <div className=""><Image src={teamLogoPath} alt="Team Logo" width={32} height={32} /></div>}
          {props.team} {regularSeasonRecords[props.team]?.wins}-{regularSeasonRecords[props.team]?.losses}
        </div>
    </div>
  );
}

export default TeamBar;