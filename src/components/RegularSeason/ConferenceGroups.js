"use client"
// Libraries
import React from "react";
// React Functions
import { useSelector } from "react-redux";
// Components
import TeamBar from "../UI/TeamBar";

// TODO: Keep working those styles: Pulse winners, make nicer
// Component Function
function ConferenceGroups(props) {
  const regularSeasonRecords = useSelector((state) => state.regularSeasonRecords.records);
 
  return (
    <div className={`max-w-300 flex flex-row flex-wrap gap-4 p-8 bg-slate-50 ${props.isPowerConf === "true" ? "" : "lg:flex hidden "}`}>
        {Object.keys(props.conferenceTeams)
          .sort((a, b) => regularSeasonRecords[b].wins - regularSeasonRecords[a].wins)
          .map((team) => <TeamBar key={team} team={team} />)}
    </div>
  );
}

export default ConferenceGroups;