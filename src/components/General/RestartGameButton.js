"use client"
// Libraries
import React from "react";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// Functions
import delay from "@/src/functions/generic/delay";
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
import { TIMER_BETWEEN_APP_STATES } from "@/constants/CONSTANTS";


// Component Function
function RestartGameButton(props) {
    const dispatch = useDispatch();

    const teamStats = useSelector((state) => state.teamStats.teamStats);

    const restartButtonClickHandler = () => {
        dispatch(appStateActions.restartGame());
        dispatch(uiStateActions.restartGame());
        dispatch(teamScheduleActions.restartGame());
        dispatch(regularSeasonRecordActions.restartGame());
        dispatch(tounramentPlayersPicksActions.restartGame());
        dispatch(tournamentActions.restartGame());
        
        Promise.all([delay(TIMER_BETWEEN_APP_STATES)]).then(() => {
            dispatch(teamScheduleActions.teamScheduleConfig(teamStats));
            dispatch(regularSeasonRecordActions.regularSeasonRecordConfig(teamStats))
        });

    };

    return (
        <Button onClick={restartButtonClickHandler} text={"Play Again"} backgroundColor={PRIMARY_COLOR} />
        );
}

export default RestartGameButton;