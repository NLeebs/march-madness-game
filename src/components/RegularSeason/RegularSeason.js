"use client"
// Libraries
import React, { Fragment, useEffect, useState } from "react";
// React Functions
import { useSelector } from "react-redux";
// Functions
import separatePowerConferences from "@/src/functions/regularSeason/separatePowerConferences";
import delay from "@/src/functions/generic/delay";
// Components
import ConferenceGroups from "./ConferenceGroups";
import PlayRegularSeasonGames from "./PlayRegularSeasonGames";
import SelectionSunday from "./SelectionSunday";


function RegularSeason(props) {
    const [pauseGames, setPauseGames] = useState(true);
    
    const appState = useSelector((state) => state.appState);
    
    // Split conferences for visualization
    const powerConferences = ["acc", "bigTen", "big12", "sec", "bigEast", "pac12", "americanAthletic", "atlantic10", "wcc"];
    const otherConferences = separatePowerConferences(props.teamStats, powerConferences);

    // Delay the Playing of the games
    useEffect(() => {
        async function pauseRegularSeasonGames() {
            if (pauseGames) {
                // await delay(5000);
                setPauseGames(false);
            }
        }
        pauseRegularSeasonGames();
    }, [pauseGames]);

    return (
        <Fragment>
            <div className="flex flex-col justify-center items-center p-8 gap-y-12">
                <div className="flex flex-row flex-wrap justify-center gap-12">
                    {powerConferences.map((conf) => <ConferenceGroups key={conf} conferenceTeams={props.teamStats[conf]} />)}
                    {otherConferences.map((conf) => <ConferenceGroups key={conf} conferenceTeams={props.teamStats[conf]} />)}
                </div>
            </div>
            {pauseGames || <PlayRegularSeasonGames teamStats={props.teamStats} />}
            {appState.selectionSunday && <SelectionSunday />}

        </Fragment>
    )
}

export default RegularSeason;