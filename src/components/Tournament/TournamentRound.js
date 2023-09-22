"use client"
// Libraries
import React from "react"
// React Functions
import { useSelector } from "react-redux"
// Components
import TournamentMatchup from "./TournamentMatchup";


function TournamentRound(props) {
    // Determine which State to pull from
    let stateRoundName;
    if (props.round === "1") stateRoundName = "roundOneMatchups";
    else if (props.round === "2") stateRoundName = "roundTwoMatchups";
    else if (props.round === "sweet sixteen") stateRoundName = "roundSweetSixteenMatchups";
    else if (props.round === "elite eight") stateRoundName = "roundEliteEightMatchups";
    else if (props.round === "final four") stateRoundName = "roundFinalFourMatchups";
    else if (props.round === "finals") stateRoundName = "roundFinalsMatchups";
    
    // Pass Matchup to Matchup Component
    let matchupObj = useSelector((state) => state.tournament[stateRoundName]);
    const tournamentMatchupElements = matchupObj[props.region].map((matchup, i) => {
        return (<TournamentMatchup key={i} matchup={matchup} />);
    })

    return (
        <div className="flex flex-col gap-y-4">
            {tournamentMatchupElements}
        </div>
    );
    
}

export default TournamentRound;