"use client"
// Libraries
import React from "react";
// React Functions
import { useSelector } from "react-redux";
// CSS Styles
import styles from './TeamBar.module.css';


// Component Function
function TeamBar(props) {
  const regularSeasonRecords = useSelector((state) => state.regularSeasonRecords.records);
  const tournamentTeamsArr = useSelector((state) => state.tournament.tournamentTeams);
  const playinTeamsObj = useSelector((state) => state.tournament.playinTeams);

  // Dynamic Styles
  let teamBarclasses = "";
  if(tournamentTeamsArr && (tournamentTeamsArr.includes(props.team) || playinTeamsObj.elevenSeeds.includes(props.team) || playinTeamsObj.sixteenSeeds.includes(props.team))) teamBarclasses = styles.goingToTheDance;

  return (
    <div>
        <div className={teamBarclasses}>{props.team} {regularSeasonRecords[props.team]?.wins}-{regularSeasonRecords[props.team]?.losses}</div>
    </div>
  );
}

export default TeamBar;