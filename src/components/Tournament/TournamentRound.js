"use client"
// Libraries
import React from "react"
// React Functions
import { useSelector } from "react-redux"
// Components
import TournamentMatchup from "./TournamentMatchup";


function TournamentRound(props) {
    // Determine which State to pull from
    let roundResultsName, playersPicksName, roundPlayClasses, roundSelectClasses;
    if (props.round === "playin") { 
        roundResultsName = "roundOneMatchups"; 
        playersPicksName = "roundTwoPicks";
        roundSelectClasses = roundPlayClasses = "gap-x-8"
    }
    else if (props.round === "1") { 
        roundResultsName = "roundOneMatchups"; 
        playersPicksName = "roundTwoPicks";
        roundSelectClasses = roundPlayClasses = "gap-y-4"
    }
    else if (props.round === "2") {
        roundResultsName = "roundTwoMatchups"; 
        playersPicksName = "roundTwoPicks";
        roundSelectClasses = "py-16 gap-y-36"
        roundPlayClasses = "py-8 gap-y-20"
    }
    else if (props.round === "sweet sixteen") {
        roundResultsName = "roundSweetSixteenMatchups"; 
        playersPicksName = "roundSweetSixteenPicks";
        roundSelectClasses = "py-48 gap-y-100"
        roundPlayClasses = "py-40 gap-y-84"
    }
    else if (props.round === "elite eight") {
        roundResultsName = "roundEliteEightMatchups"; 
        playersPicksName = "roundEliteEightPicks";
        roundSelectClasses = "py-112 gap-y-100"
        roundPlayClasses = "py-104 gap-y-96"
    }
    else if (props.round === "final four") {
        roundResultsName = "roundFinalFourMatchups"; 
        playersPicksName = "roundFinalFourPicks";
        roundSelectClasses = "py-252"
        roundPlayClasses = "py-252"
    }
    else if (props.round === "finals") {
        roundResultsName = "roundFinalsMatchups"; 
        playersPicksName = "roundFinalsPicks";
        roundSelectClasses = "pt-252"
        roundPlayClasses = "pt-252"
    }
    else if (props.round === "champion") {
        roundResultsName = "champion"; 
        playersPicksName = "champion";
        roundPlayClasses = ""
    }
    
    // State
    const appState = useSelector((state) => state.appState);
    const matchupObj = useSelector((state) => state.tournament[roundResultsName]);
    const playerPicksObj = useSelector((state) => state.tournamentPlayersPicks.picks[playersPicksName])
    
    // Pass Matchups to Matchup Component
    let matchupElGenerationArr;
    if (props.round === "playin" || 
        props.round === "1" || 
        (props.round === "2" && appState.tournamentPlayRoundTwo) ||
        (props.round === "sweet sixteen" && appState.tournamentPlaySweetSixteen) ||
        (props.round === "elite eight" && appState.tournamentPlayEliteEight) ||
        (props.round === "final four" && appState.tournamentPlayFinalFour) ||
        (props.round === "finals" && appState.tournamentPlayFinals) || 
        appState.tournamentRecap) matchupElGenerationArr = matchupObj;
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
            return (<TournamentMatchup key={i} index={i} region={props.region} round={props.round}  matchup={matchup} playerpicks={playerPicksObj[props.region][i]} />);
        })
    }

    return (
        <div className={`flex m-4
            ${props.round === "playin" ? "flex-row justify-center" : "flex-col"} 
            ${appState.tournamentPlayGames ? roundPlayClasses : roundSelectClasses}`}
        >
            {tournamentMatchupElements}
        </div>
    );
    
}

export default TournamentRound;