"use client";
import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { TeamBar } from "@/src/components";
import { TeamMap } from "@/schemas";

interface ConferenceGroupsProps {
  conferenceTeams: TeamMap;
  isPowerConf: string;
}

export const ConferenceGroups: React.FC<ConferenceGroupsProps> = ({
  conferenceTeams,
  isPowerConf,
}) => {
  const appState = useSelector((state: RootState) => state.appState);
  const regularSeasonRecords = useSelector(
    (state: RootState) => state.regularSeasonRecords.records
  );

  return (
    <div
      className={`max-w-300 flex flex-row flex-wrap gap-4 p-8 bg-slate-50 
      ${isPowerConf === "true" ? "" : "lg:flex hidden "}
      transition-opacity duration-500 opacity-0
      ${(!appState.transition || appState.selectionSunday) && "opacity-100"}`}
    >
      {Object.keys(conferenceTeams)
        .sort(
          (a, b) => regularSeasonRecords[b].wins - regularSeasonRecords[a].wins
        )
        .map((team) => (
          <TeamBar key={team} team={team} />
        ))}
    </div>
  );
};

export default ConferenceGroups;
