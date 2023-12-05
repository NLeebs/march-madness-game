"use client"
// Libraries
import React, { useCallback } from "react"
// React Functions
import { useSelector, useDispatch } from "react-redux"
// State
import { tounramentPlayersPicksActions } from "@/store/tournamentPlayersPicksSlice";
// Css Styles
import styles from "./TournamentMatchup.module.css";
// Components
import TeamBar from "../UI/TeamBar";
import PlayerPickBar from "../UI/PlayerPickBar";


function TournamentMatchup(props) {
    const dispatch = useDispatch();

    const appState = useSelector((state) => state.appState)

    // Account for change of regions in final four and beyond
    let nextRoundRegion;
    let teamIndex;
    if (props.round === "elite eight" && props.region === "west") {nextRoundRegion = "eastWest"; teamIndex = 0}
    else if (props.round === "elite eight" && props.region === "east") {nextRoundRegion = "eastWest"; teamIndex = 1}
    else if (props.round === "elite eight" && props.region === "south") {nextRoundRegion = "southMidwest"; teamIndex = 0;}
    else if (props.round === "elite eight" && props.region === "midwest") {nextRoundRegion = "southMidwest"; teamIndex = 1}
    else if (props.round === "final four" && props.region === "eastWest") {nextRoundRegion = "championship"; teamIndex = 0}
    else if (props.round === "final four" && props.region === "southMidwest") {nextRoundRegion = "championship"; teamIndex = 1}
    else if (props.round === "finals") {nextRoundRegion = "champion"; teamIndex = 0;}
    else {nextRoundRegion = props.region; teamIndex = props.index}

    // Handle click of a team during selection
    const teamSelectionClickHandler = useCallback((e) => {
        const teamEl = e.target.closest('div.team-selection');
        let opponentEl;
        if (teamEl.getAttribute('value') === "0" ) opponentEl = teamEl.closest('div.matchup-container').querySelector('div.team-selection[value="1"]');
        else if (teamEl.getAttribute('value') === "1") opponentEl = teamEl.closest('div.matchup-container').querySelector('div.team-selection[value="0"]');

        dispatch(tounramentPlayersPicksActions.setPick({
            round: props.round,
            region: nextRoundRegion,
            roundIndex: teamIndex,
            team: teamEl.getAttribute('team'),
            seed: teamEl.getAttribute('seed'),
            opponent: opponentEl.getAttribute('team'),
        }));
    }, [dispatch, nextRoundRegion, props.round, teamIndex]);

    // Create the matchup JSX elements
    const matchupElements = props.matchup.map((teamObj, i) => {
        return (
            <div 
                key={i}
                className="relative z-10"
                onClick={appState.tournamentSelection ? teamSelectionClickHandler : undefined} 
                value={i} 
                team={teamObj.team} 
                seed={teamObj.seed} 
            >
                {(appState.tournamentPlayPlayinGames || appState.tournamentPlayGames) && props.round !== "playin" && props.round !== "1" && i % 2 === 0 && <PlayerPickBar team={teamObj.team} pick={props.playerpicks[i]?.team} />}
                <div 
                    onClick={appState.tournamentSelection ? teamSelectionClickHandler : undefined} 
                    value={i} 
                    team={teamObj.team} 
                    seed={teamObj.seed} 
                    className={`team-selection flex items-center px-4 h-14 border-2 border-slate-100 cursor-pointer 
                    ${props.round === "playin" && 'min-w-300'}`
                }
                >
                    <div className="flex justify-center items-center w-6 pr-2">
                        {teamObj.seed}
                    </div>
                    <TeamBar team={teamObj.team} win={teamObj?.win} score={teamObj?.score} />
                </div>
                {(appState.tournamentPlayPlayinGames || appState.tournamentPlayGames) && props.round !== "playin" && props.round !== "1" && i % 2 === 1 && <PlayerPickBar team={teamObj.team} pick={props.playerpicks[i]?.team} />}
            </div>
        );
    })

    // JSX
    return (
        <div className="matchup-container bg-slate-50 w-teamBar">
            {matchupElements}
        </div>
    );
    
}

export default TournamentMatchup;