"use client"
// Libraries
import React from "react";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";
import { validateConfig } from "next/dist/server/config-shared";


// Component Function
function PlayTournamentButton() {
    const dispatch = useDispatch();

    // State
    const playerPicksObj = useSelector((state) => state.tournamentPlayersPicks.picks);

    // Change state to tourny play
    const activateTournamentPlay = () => {
        dispatch(appStateActions.activateTournamentPlayGamesState())
    }

    // Check to see if all picks are in
    const isAllPicksSelected = Object.keys(playerPicksObj).every((round) => {
        return Object.keys(playerPicksObj[round]).every((region) => {
            return playerPicksObj[round][region].every((matchup) => {
                return matchup.every((team => {
                    return team.team !== "";
                }));
            });
        });
    });

    return (<button disabled={!isAllPicksSelected} onClick={activateTournamentPlay}>Submit Picks</button>);
}

export default PlayTournamentButton;