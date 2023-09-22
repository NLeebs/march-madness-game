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

    useEffect(() => {
        dispatch(tournamentActions.setRoundOneMatchups());
    }, [dispatch])

    return (
        <div className="flex flex-col gap-y-16">
            <TournamentRound region="east" round="1" />
            <TournamentRound region="west" round="1" />
            <TournamentRound region="south" round="1" />
            <TournamentRound region="midwest" round="1" />
        </div>
    );
}

export default Tournament;