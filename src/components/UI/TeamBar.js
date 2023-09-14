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

  return (
    <div>
        <div className={
          tournamentTeamsArr && tournamentTeamsArr.includes(props.team) && styles.goingToTheDance
          }>{props.team} {regularSeasonRecords[props.team].wins}-{regularSeasonRecords[props.team].losses}</div>
    </div>
  );
}

export default TeamBar;