"use client"
// Libraries
import React, { useCallback } from "react"
// React Functions
import { useSelector, useDispatch } from "react-redux"
// State
import { tounramentPlayersPicksActions } from "@/store/tournamentPlayersPicksSlice";
// Components
import TeamBar from "../UI/TeamBar";


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

    const teamSelectionClickHandler = useCallback((e) => {
        const teamEl = e.target.closest('div.team-selection');
        let opponentEl;
        if (teamEl.getAttribute('value') === "0" ) opponentEl = teamEl.nextElementSibling;
        else if (teamEl.getAttribute('value') === "1") opponentEl = teamEl.previousElementSibling;

        dispatch(tounramentPlayersPicksActions.setPick({
            round: props.round,
            region: nextRoundRegion,
            roundIndex: teamIndex,
            team: teamEl.getAttribute('team'),
            seed: teamEl.getAttribute('seed'),
            opponent: opponentEl.getAttribute('team'),
        }));
    }, [dispatch, nextRoundRegion, props.round, teamIndex]);

    const matchupElements = props.matchup.map((teamObj, i) => {
        return (
        <div key={i} onClick={appState.tournamentSelection ? teamSelectionClickHandler : undefined} value={i} team={teamObj.team} seed={teamObj.seed} className={`team-selection flex items-center px-4 h-14 border-2 border-slate-100 rounded-md cursor-pointer ${props.round === "playin" && 'min-w-300'}`}>
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