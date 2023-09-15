"use client"
// Libraries
import React from "react"
// React Functions
import { useSelector } from "react-redux"
// Components
import TournamentRound from "./TournamentRound";

function Tournament(props) {
    const tournamentTeamsState = useSelector((state) => state.tournament.tournamentSeeds);
    const tournamentPlayinsState = useSelector((state) => state.tournament.playinTeams);
    console.log(tournamentTeamsState);
    console.log(tournamentPlayinsState);

    return (
        <TournamentRound />
    );
}

export default Tournament;