"use client"
// Libraries
import React from "react"
// React Functions
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux"
// State
import { tournamentActions } from "@/store/tournamentSlice";
// Components
import TournamentRound from "./TournamentRound";

function Tournament(props) {
    const dispatch = useDispatch();
    const roundOneMatchups = useSelector((state) => state.tournament.roundOneMatchups)
    
    console.log(roundOneMatchups);

    useEffect(() => {
        dispatch(tournamentActions.setRoundOneMatchups());
    }, [dispatch])

    return (
        <TournamentRound region="east" round="1" />
    );
}

export default Tournament;