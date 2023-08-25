"use client"
// Libraries
import React, { Fragment } from "react";
// React Functions
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
// Functions
import separatePowerConferences from "@/src/functions/regularSeason/separatePowerConferences";
// Components
import ConferenceGroups from "./ConferenceGroups";
import PlayRegularSeasonGames from "./PlayRegularSeasonGames";


function RegularSeason(props) {

    // Split conferences for visualization
    const powerConferences = ["acc", "bigTen", "big12", "sec", "bigEast", "pac12", "americanAthletic", "atlantic10", "wcc"];
    const otherConferences = separatePowerConferences(props.teamStats, powerConferences);

    return (
        <Fragment>
            <div>
                <div>
                    {powerConferences.map((conf) => <ConferenceGroups key={conf} conferenceTeams={props.teamStats[conf]} />)}
                </div>
                <div>
                    {otherConferences.map((conf) => <ConferenceGroups key={conf} conferenceTeams={props.teamStats[conf]} />)}
                </div>
            </div>
            <PlayRegularSeasonGames teamStats={props.teamStats} />
        </Fragment>
    )
}

export default RegularSeason;