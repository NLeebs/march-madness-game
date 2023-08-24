"use client"
// Libraries
import React from "react";
// Components
import TeamBar from "../UI/TeamBar";


// Component Function
function ConferenceGroups(props) {

  return (
    <div className="flex flex-row flex-wrap gap-4">
        {Object.keys(props.conferenceTeams).map((team) => <TeamBar key={team} team={team} />)}
    </div>
  );
}

export default ConferenceGroups;