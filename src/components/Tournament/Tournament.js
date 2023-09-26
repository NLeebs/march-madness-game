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
        <div className="grid grid-flow-col auto-rows-min">
            <div className="col-span-1 flex flex-col gap-y-16">
                <TournamentRound region="east" round="1" />
                <TournamentRound region="west" round="1" />
            </div>
            <div className="col-span-1 flex flex-col gap-y-16">
                <TournamentRound region="east" round="2" />
                <TournamentRound region="west" round="2" />
            </div>
            <div className="col-span-1 flex flex-col gap-y-16">
                <TournamentRound region="south" round="2" />
                <TournamentRound region="midwest" round="2" />
            </div>
            <div className="col-span-1 flex flex-col gap-y-16">
                <TournamentRound region="south" round="1" />
                <TournamentRound region="midwest" round="1" />
            </div>
        </div>
    );
}

export default Tournament;