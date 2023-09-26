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
        <div key={i} className="flex items-center px-4 h-14 border-2 border-slate-100 rounded-md">
            <div className="flex justify-center items-center w-6 pr-2">
                {teamObj.seed}
            </div>
            <TeamBar team={teamObj.team} />
        </div>);
    })

    return (
        <div className="bg-slate-50 rounded-md">
            {matchupElements}
        </div>
    );
    
}

export default TournamentMatchup;