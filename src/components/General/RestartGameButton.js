"use client"
// Libraries
import React from "react";
// React Functions
import { useDispatch, useSelector } from "react-redux";
//State
import { appStateActions } from "@/store/appStateSlice";
import { uiStateActions } from "@/store/uiStateSlice";
import { teamScheduleActions } from "@/store/teamScheduleSlice";
import { regularSeasonRecordActions } from "@/store/regularSeasonRecordSlice";
import { tounramentPlayersPicksActions } from "@/store/tournamentPlayersPicksSlice";
import { tournamentActions } from "@/store/tournamentSlice";
// Components
import Button from "../UI/Button";
// Constants
import { PRIMARY_COLOR } from "@/constants/CONSTANTS";


// Component Function
function RestartGameButton(props) {
    const dispatch = useDispatch();

    const teamStats = useSelector((state) => state.teamStats.teamStats);

    const restartButtonClickHandler = () => {
        dispatch(appStateActions.restartGame());
        dispatch(appStateActions.loadingComplete());

        dispatch(uiStateActions.restartGame());

        dispatch(teamScheduleActions.restartGame());
        dispatch(teamScheduleActions.teamScheduleConfig(teamStats));

        dispatch(regularSeasonRecordActions.restartGame());
        dispatch(regularSeasonRecordActions.regularSeasonRecordConfig(teamStats))

        dispatch(tounramentPlayersPicksActions.restartGame());

        dispatch(tournamentActions.restartGame());

    }

    return (
        <Button onClick={restartButtonClickHandler} text={"Play Again"} backgroundColor={PRIMARY_COLOR} />
        );
}

export default RestartGameButton;