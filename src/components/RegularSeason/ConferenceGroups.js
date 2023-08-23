"use client"
// Libraries
import React from "react";


// Component Function
function ConferenceGroups(props) {

  return (
    <div className="flex flex-row flex-wrap gap-4">
        {Object.keys(props.conferenceTeams).map((team) => <div key={team}>{team}</div>)}
    </div>
  );
}

export default ConferenceGroups;