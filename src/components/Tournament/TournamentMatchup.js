"use client"
// Libraries
import React, { useCallback } from "react"
import { motion } from "framer-motion";
// React Functions
import { useSelector, useDispatch } from "react-redux"
// Functions
import findTeamConference from "@/src/functions/teamStatsData/findTeamConference";
// State
import { tounramentPlayersPicksActions } from "@/store/tournamentPlayersPicksSlice";
// Css Styles
import classes from "./TournamentMatchup.module.css";
// Components
import TeamBar from "../UI/TeamBar";
import PlayerPickBar from "../UI/PlayerPickBar";
// Constants
import { NON_CTA_BUTTON_COLOR, 
        TOURAMENT_CHAMPION_RIBBON_HEIGHT } from "@/constants/CONSTANTS";


function TournamentMatchup(props) {
    const dispatch = useDispatch();

    // State
    const appState = useSelector((state) => state.appState)
    const teamStatsObject = useSelector((state) => state.teamStats.teamStats);
    const confArrs = useSelector((state) => state.teamStats.conferenceArrays);


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


    // Champion Dynamic Styles
    let teamBarHeight, teamBarColor, championPrimaryColor;
    if (props.round === "champion" && props.matchup[0].team) {
        if (props.matchup[0].team !== "playinGameSeed16Game1" && props.matchup[0].team !== "playinGameSeed16Game2" && 
            props.matchup[0].team !== "playinGameSeed11Game1" && props.matchup[0].team !== "playinGameSeed11Game2") {
            // Find conference of the team
            const teamConf = findTeamConference(props.matchup[0].team, confArrs);
            // Find Champion Team Color
            championPrimaryColor = teamStatsObject[teamConf][props.matchup[0].team]["primary-color"];
        }
        // If playin game is selected to win tourney
        else {
            championPrimaryColor = NON_CTA_BUTTON_COLOR;
        }

        teamBarHeight = TOURAMENT_CHAMPION_RIBBON_HEIGHT;
        teamBarColor = championPrimaryColor;
    }
    else {
        teamBarHeight = "auto";
        teamBarColor = NON_CTA_BUTTON_COLOR;
    }


    // Create the matchup JSX elements
    const matchupElements = props.matchup.map((teamObj, i) => {
        return (
            <motion.div 
                key={i}
                className={`relative z-10
                    ${props.round === "champion" && props.matchup[0].team ? "flex justify-center items-center" : ""}
                `}
                onClick={appState.tournamentSelection ? teamSelectionClickHandler : undefined} 
                value={i} 
                team={teamObj.team} 
                seed={teamObj.seed} 

                intial={{
                    height: "auto", 
                    backgroundColor: teamBarColor,
                }}
                animate={{
                    height: teamBarHeight,
                    backgroundColor: teamBarColor,
                }}
            >
                {(appState.tournamentPlayPlayinGames || appState.tournamentPlayGames) && props.round !== "playin" && props.round !== "1" && i % 2 === 0 && <PlayerPickBar team={teamObj.team} pick={props.playerpicks[i]?.team} />}
                <div 
                    onClick={appState.tournamentSelection ? teamSelectionClickHandler : undefined} 
                    value={i} 
                    team={teamObj.team} 
                    seed={teamObj.seed} 
                    className={`team-selection flex items-center px-4 h-14 
                        ${props.round === "champion" && props.matchup[0].team ? "" : "border-2 border-slate-100 cursor-pointer"} 
                        ${props.round === "playin" && 'min-w-300'}`
                }
                >
                    {props.round !== "champion" && 
                    <div className="flex justify-center items-center w-6 pr-2">
                        {teamObj.seed}
                    </div>}

                    <TeamBar round={props.round} team={teamObj.team} win={teamObj?.win} score={teamObj?.score} />
                </div>
                {(appState.tournamentPlayPlayinGames || appState.tournamentPlayGames) && props.round !== "playin" && props.round !== "1" && i % 2 === 1 && <PlayerPickBar team={teamObj.team} pick={props.playerpicks[i]?.team} />}
                
                {props.round === "champion" && props.matchup[0].team && 
                    <motion.div 
                        className={classes.championRibbon}
                        intial={{
                            borderTopColor: teamBarColor,
                        }}
                        animate={{
                            borderTopColor: teamBarColor,
                        }}
                    >
                    </motion.div>}
            </motion.div>
        );
    })


    // JSX
    return (
        <div 
            className="matchup-container w-teamBar"
            style={{backgroundColor: NON_CTA_BUTTON_COLOR,}}
        >
            {matchupElements}
        </div>
    );
    
}

export default TournamentMatchup;