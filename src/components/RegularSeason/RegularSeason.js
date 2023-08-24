"use client"
// React Functions
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
// Functions
import separatePowerConferences from "@/src/functions/regularSeason/separatePowerConferences";
// Components
import ConferenceGroups from "./ConferenceGroups";


function RegularSeason(props) {
    const teamSchedules = useSelector((state) => state.teamSchedule.teamSchedules);
    const regularSeasonRecords = useSelector((state) => state.regularSeasonRecords.records);

    // Split conferences for visualization
    const powerConferences = ["acc", "bigTen", "big12", "sec", "bigEast", "pac12", "americanAthletic", "atlantic10", "wcc"];
    const otherConferences = separatePowerConferences(props.teamStats, powerConferences);

    return (
        <div>
            <div>
                {powerConferences.map((conf) => <ConferenceGroups key={conf} conferenceTeams={props.teamStats[conf]} />)}
            </div>
            <div>
                {otherConferences.map((conf) => <ConferenceGroups key={conf} conferenceTeams={props.teamStats[conf]} />)}
            </div>
        </div>
    )
}

export default RegularSeason;