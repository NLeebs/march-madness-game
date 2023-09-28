"use client"
// Libraries
import React  from "react"
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
        <div className="grid grid-flow-row">
            <div className="grid grid-flow-col">
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300">
                    <TournamentRound region="west" round="1" />
                    <TournamentRound region="east" round="1" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300">
                    <TournamentRound region="west" round="2" />
                    <TournamentRound region="east" round="2" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300">
                    <TournamentRound region="west" round="sweet sixteen" />
                    <TournamentRound region="east" round="sweet sixteen" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300">
                    <TournamentRound region="west" round="elite eight" />
                    <TournamentRound region="east" round="elite eight" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300">
                    <TournamentRound region="eastWest" round="final four" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16">
                    <div className="flex flex-col gap-y-16 min-w-300">
                        <TournamentRound region="championship" round="finals" />
                    </div>
                    <div className="flex flex-col gap-y-16 min-w-300">
                        <TournamentRound region="champion" round="champion" />
                    </div>
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300">
                    <TournamentRound region="southMidwest" round="final four" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300">
                    <TournamentRound region="south" round="elite eight" />
                    <TournamentRound region="midwest" round="elite eight" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300">
                    <TournamentRound region="south" round="sweet sixteen" />
                    <TournamentRound region="midwest" round="sweet sixteen" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300">
                    <TournamentRound region="south" round="2" />
                    <TournamentRound region="midwest" round="2" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300">
                    <TournamentRound region="south" round="1" />
                    <TournamentRound region="midwest" round="1" />
                </div>
            </div>
            <div>
                <TournamentRound region="playin" round="playin" />
            </div>
        </div>
    );
}

export default Tournament;