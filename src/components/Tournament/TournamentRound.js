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
    if (props.round === "playin") { 
        roundResultsName = "roundOneMatchups"; 
        playersPicksName = "roundTwoPicks";
        roundClasses = "flex-row justify-center gap-x-8"
    }
    else if (props.round === "1") { 
        roundResultsName = "roundOneMatchups"; 
        playersPicksName = "roundTwoPicks";
        roundClasses = "flex-col gap-y-4"
    }
    else if (props.round === "2") {
        roundResultsName = "roundTwoMatchups"; 
        playersPicksName = "roundTwoPicks";
        roundClasses = "flex-col py-16 gap-y-36"
    }
    else if (props.round === "sweet sixteen") {
        roundResultsName = "roundSweetSixteenMatchups"; 
        playersPicksName = "roundSweetSixteenPicks";
        roundClasses = "flex-col py-48 gap-y-96"
    }
    else if (props.round === "elite eight") {
        roundResultsName = "roundEliteEightMatchups"; 
        playersPicksName = "roundEliteEightPicks";
        roundClasses = "flex-col py-112 gap-y-96"
    }
    else if (props.round === "final four") {
        roundResultsName = "roundFinalFourMatchups"; 
        playersPicksName = "roundFinalFourPicks";
        roundClasses = "flex-col py-252"
    }
    else if (props.round === "finals") {
        roundResultsName = "roundFinalsMatchups"; 
        playersPicksName = "roundFinalsPicks";
        roundClasses = "flex-col pt-252"
    }
    else if (props.round === "champion") {
        roundResultsName = "champion"; 
        playersPicksName = "champion";
        roundClasses = "flex-col"
    }
    
    // State
    const appState = useSelector((state) => state.appState);
    const matchupObj = useSelector((state) => state.tournament[roundResultsName]);
    const playerPicksObj = useSelector((state) => state.tournamentPlayersPicks.picks[playersPicksName])
    
    // Pass Matchups to Matchup Component
    let matchupElGenerationArr;
    if (props.round === "playin" || props.round === "1" || (props.round === "2" && appState.tournamentPlayRoundTwo)) matchupElGenerationArr = matchupObj;
    else  matchupElGenerationArr = playerPicksObj;

    let tournamentMatchupElements;
    // Generate matchups for playin round
    if (props.round === "playin") {
        const tournamentMatchupElementsElevenSeeds = matchupElGenerationArr.playin.elevenSeeds.map((matchup, i) => {
            return (<TournamentMatchup key={i} index={i} region={props.region} round={props.round}  matchup={matchup} />);
        });
        const tournamentMatchupElementsSixteenSeeds = matchupElGenerationArr.playin.sixteenSeeds.map((matchup, i) => {
            return (<TournamentMatchup key={i + 2} index={i} region={props.region} round={props.round}  matchup={matchup} />);
        });
        tournamentMatchupElements = [...tournamentMatchupElementsElevenSeeds, ...tournamentMatchupElementsSixteenSeeds]
        
    } 
    // Generate Matchups for all other rounds
    else {
        tournamentMatchupElements = matchupElGenerationArr[props.region].map((matchup, i) => {
            return (<TournamentMatchup key={i} index={i} region={props.region} round={props.round}  matchup={matchup} />);
        })
    }

    return (
        <div className={`flex m-4 ${roundClasses}`}>
            {tournamentMatchupElements}
        </div>
    );
    
}

export default TournamentRound;