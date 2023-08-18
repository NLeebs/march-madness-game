"use client"
// Libraries
import React from "react";
// Functions
import getTeamStatsData from "@/src/functions/teamStatsData/getTeamStatData";


// Component Function
function StartButton() {

  return (<button onClick={getTeamStatsData}>Start!</button>);
}

export default StartButton;