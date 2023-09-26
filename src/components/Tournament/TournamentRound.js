"use client"
// Libraries
import React from "react"
// React Functions
import { useSelector } from "react-redux"
// Components
import TournamentMatchup from "./TournamentMatchup";


function TournamentRound(props) {
    // Determine which State to pull from
    let roundResultsName;
    let playersPicksName;
    let roundClasses;
    if (props.round === "1") { 
        roundResultsName = "roundOneMatchups"; 
        playersPicksName = "roundTwoPicks";
        roundClasses = "gap-y-4"
    }
    else if (props.round === "2") {
        roundResultsName = "roundTwoMatchups"; 
        playersPicksName = "roundTwoPicks";
        roundClasses = "py-16 gap-y-36"
    }
    else if (props.round === "sweet sixteen") {
        roundResultsName = "roundSweetSixteenMatchups"; 
        playersPicksName = "roundSweetSixteenPicks";
    }
    else if (props.round === "elite eight") {
        roundResultsName = "roundEliteEightMatchups"; 
        playersPicksName = "roundEliteEightPicks";
    }
    else if (props.round === "final four") {
        roundResultsName = "roundFinalFourMatchups"; 
        playersPicksName = "roundFinalFourPicks";
    }
    else if (props.round === "finals") {
        roundResultsName = "roundFinalsMatchups"; 
        playersPicksName = "roundFinalFourPicks";
    }
    
    // State
    const matchupObj = useSelector((state) => state.tournament[roundResultsName]);
    const playerPicksObj = useSelector((state) => state.tournamentPlayersPicks[playersPicksName])

    
    // Pass Matchups to Matchup Component
    let matchupElGenerationArr;
    if (props.round === "1") matchupElGenerationArr = matchupObj;
    else  matchupElGenerationArr = playerPicksObj;

    const tournamentMatchupElements = matchupElGenerationArr[props.region].map((matchup, i) => {
        return (<TournamentMatchup key={i} matchup={matchup} />);
    })

    return (
        <div className={`flex flex-col m-4 ${roundClasses}`}>
            {tournamentMatchupElements}
        </div>
    );
    
}

export default TournamentRound;