"use client"
// Libraries
import React from "react"
// React Functions
import { useSelector } from "react-redux"
// Components
import TeamBar from "../UI/TeamBar";


function TournamentMatchup(props) {
  
    const matchupElements = props.matchup.map((teamObj, i) => {
        return (
        <div key={i} className="flex px-4">
            <div className="w-8 flex justify-center items-center">
                {teamObj.seed}
            </div>
            <TeamBar team={teamObj.team} />
        </div>);
    })

    return (
        <div>
            {matchupElements}
        </div>
    );
    
}

export default TournamentMatchup;