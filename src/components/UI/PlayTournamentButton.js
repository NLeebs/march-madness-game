"use client"
// Libraries
import React from "react";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";
// Components
import BasketballSVG from "../Graphics/BasketballSVG";
// Constants
import { PRIMARY_COLOR, SECONDARY_COLOR } from "@/constants/CONSTANTS";


// Component Function
function PlayTournamentButton() {
    const dispatch = useDispatch();

    // State
    const playerPicksObj = useSelector((state) => state.tournamentPlayersPicks.picks);

    // Change state to tourny play
    const activateTournamentPlay = () => {
        dispatch(appStateActions.activateTournamentPlayinGamesState())
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

    return (
        <button 
            disabled={!isAllPicksSelected} 
            onClick={activateTournamentPlay}
            className={`relative rounded-full transition-transform ease-out "hover:scale-110" focus-visible:outline-neutral-300`}
        >
            <div 
                className={`absolute inset-0 w-full h-full z-10 flex justify-center items-center rounded-full ${!isAllPicksSelected ? "opacity-50" : "opacity-20"}`}
                style={{
                backgroundColor: `${!isAllPicksSelected ? "#d1d5db" : PRIMARY_COLOR}`,
                }}
            >
            </div>
            <div className={`absolute inset-0 w-full h-full z-10 flex justify-center items-center rounded-full`}>
                <h3 className={`${"text-neutral-50"}`}>
                    {!isAllPicksSelected ? "Fill In Bracket" : "Submit Picks"}
                </h3>
            </div>
            <div className={`${isAllPicksSelected && 'motion-safe:animate-spin-slow'}`}>
                <BasketballSVG 
                    size={"200"} 
                    basketballColor={PRIMARY_COLOR} 
                    seamColor={SECONDARY_COLOR} 
                />
            </div>
           
        </button>
    );
}

export default PlayTournamentButton;