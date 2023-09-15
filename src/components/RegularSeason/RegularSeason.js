"use client"
// Libraries
import React, { Fragment } from "react";
// React Functions
import { useSelector } from "react-redux";
// Functions
import separatePowerConferences from "@/src/functions/regularSeason/separatePowerConferences";
// Components
import ConferenceGroups from "./ConferenceGroups";
import PlayRegularSeasonGames from "./PlayRegularSeasonGames";
import SelectionSunday from "./SelectionSunday";


function RegularSeason(props) {
    const appState = useSelector((state) => state.appState);
    const tournamemtTeamsState = useSelector((state) => state.tournament.tournamentTeams);
    const playinTeamsState = useSelector((state) => state.tournament.playinTeams);
    const tournamentSeedsState = useSelector((state) => state.tournament.tournamentSeeds);
    console.log(playinTeamsState);
    console.log(tournamentSeedsState);

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
            {appState.selectionSunday && <SelectionSunday />}

        </Fragment>
    )
}

export default RegularSeason;