"use client"
// Libraries
import React, { Fragment, useEffect, useState } from "react";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";
// Functions
import separatePowerConferences from "@/src/functions/regularSeason/separatePowerConferences";
import delay from "@/src/functions/generic/delay";
// Components
import ConferenceGroups from "./ConferenceGroups";
import PlayRegularSeasonGames from "./PlayRegularSeasonGames";
import SelectionSunday from "./SelectionSunday";
// Constants
import { TIMER_TRIGGER_FADE } from "@/constants/CONSTANTS";


function RegularSeason(props) {
    const dispatch = useDispatch();
    
    const appState = useSelector((state) => state.appState);
    
    // Split conferences for visualization
    const powerConferences = ["acc", "bigTen", "big12", "sec", "bigEast", "pac12", "americanAthletic", "atlantic10", "wcc"];
    const otherConferences = separatePowerConferences(props.teamStats, powerConferences);

    useEffect(() => {
        Promise.all([delay(TIMER_TRIGGER_FADE)]).then(() => {
            dispatch(appStateActions.deactivateTransition());
        }); 
    }, [dispatch]);
    
    return (
        <Fragment>
            <div className="flex flex-col justify-center items-center p-8 gap-y-12">
                <div className="flex flex-row flex-wrap justify-center gap-12">
                    {powerConferences.map((conf) => <ConferenceGroups key={conf} isPowerConf="true" conferenceTeams={props.teamStats[conf]} />)}
                    {otherConferences.map((conf) => <ConferenceGroups key={conf} isPowerConf="false" conferenceTeams={props.teamStats[conf]} />)}
                </div>
            </div>
            {appState.transition || <PlayRegularSeasonGames teamStats={props.teamStats} />}
            {appState.selectionSunday && <SelectionSunday />}

        </Fragment>
    )
}

export default RegularSeason;