"use client"
// Libraries
import React, { Fragment }  from "react"
import { motion } from "framer-motion";
// React Functions
import { useEffect } from "react";
import { useDispatch } from "react-redux"
// State
import { tournamentActions } from "@/store/tournamentSlice";
// Components
import TournamentRound from "./TournamentRound";
import PlayTournamentButton from "../UI/PlayTournamentButton";
import PlayerScore from "./PlayerScore";


function Tournament(props) {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(tournamentActions.setRoundOneMatchups());
    }, [dispatch])

    return (
        <motion.div 
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            className="mx-auto max-w-tourny grid grid-flow-row"
        >
            <div className="grid grid-flow-col relative">
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300">
                    <TournamentRound region="west" round="1" />
                    <TournamentRound region="east" round="1" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300 relative">
                    <TournamentRound region="west" round="2" />
                    <TournamentRound region="east" round="2" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300 absolute left-120">
                    <TournamentRound region="west" round="sweet sixteen" />
                    <TournamentRound region="east" round="sweet sixteen" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300 relative left-20">
                    <TournamentRound region="west" round="elite eight" />
                    <TournamentRound region="east" round="elite eight" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300 absolute left-156">
                    <TournamentRound region="eastWest" round="final four" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16">
                    <div className="flex flex-col gap-y-16 min-w-300">
                        <TournamentRound region="championship" round="finals" />
                    </div>
                    <div className="flex flex-col gap-y-16 min-w-300">
                        <TournamentRound region="champion" round="champion" />
                    </div>
                    <PlayTournamentButton />
                    {props.appState.tournamentPlayGames && <PlayerScore />}
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300 absolute right-156">
                    <TournamentRound region="southMidwest" round="final four" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300 relative right-20">
                    <TournamentRound region="south" round="elite eight" />
                    <TournamentRound region="midwest" round="elite eight" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300 absolute right-120">
                    <TournamentRound region="south" round="sweet sixteen" />
                    <TournamentRound region="midwest" round="sweet sixteen" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 min-w-300 relative">
                    <TournamentRound region="south" round="2" />
                    <TournamentRound region="midwest" round="2" />
                </div>
                <div className="col-span-1 flex flex-col gap-y-16 relative">
                    <TournamentRound region="south" round="1" />
                    <TournamentRound region="midwest" round="1" />
                </div>
            </div>
            <div>
                <TournamentRound region="playin" round="playin" />
            </div>
        </motion.div>
    );
}

export default Tournament;