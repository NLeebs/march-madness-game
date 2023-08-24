"use client"
// Libraries
import React from "react";
// React Functions
import { useSelector } from "react-redux";


// Component Function
function TeamBar(props) {
  const regularSeasonRecords = useSelector((state) => state.regularSeasonRecords.records);

  return (
    <div>
        <div>{props.team} {regularSeasonRecords[props.team].wins}-{regularSeasonRecords[props.team].losses}</div>
    </div>
  );
}

export default TeamBar;