// Libraries
import React, { Fragment } from "react";
// React Functions
import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
// State
import { teamScheduleActions } from "@/store/teamScheduleSlice";


function SeasonSchedule(props) {
    const dispatch = useDispatch();
    const teamSchedules = useSelector((state) => state.teamSchedule.teamSchedules);
    console.log("Schedules", teamSchedules);
    // Try to do all the teams at once

    // Declare function to schedule a non-conference game for every team
    const scheduleNonConferenceGame = useCallback((teamArray) => {
        let allNCAATeamsArr = [...teamArray];
    
        while (allNCAATeamsArr.length >= 2) {
            // Get and remove team 1
            const indexTeam1 = Math.floor(Math.random() * allNCAATeamsArr.length);
            const team1 = allNCAATeamsArr.splice(indexTeam1, 1)[0];
        
            // Get and remove team 2
            const indexTeam2 = Math.floor(Math.random() * allNCAATeamsArr.length);
            const team2 = allNCAATeamsArr.splice(indexTeam2, 1)[0]; 
    
            dispatch(teamScheduleActions.addGameToTeamSchedule({weekNumber: 'week1', matchup: [team1, team2]}));
            // dispatch(teamScheduleActions.addGameToTeamSchedule({team: team2, opponent: team1}));
        }
    
    }, [dispatch]);

    useEffect(() => {
        if (props.teamArray.length > 0) {
            scheduleNonConferenceGame(props.teamArray);
        }
    }, [props.teamArray, scheduleNonConferenceGame])
    
    // Loop for 15 games

        // 360 teams and randomly matchup each team with someone in the NCAA
        // Add teams to schedule array
             // payload should be object like {team: TeamName, opponent: TeamName}
        // Can't schedule the same team twice

    // Loop for 15 games

        // Largest conference is 15
        // Everone plays each other once 
        // randomly if conferences are less than 15 teams
        // Add teams to schedule array

    // Add schedule array to state slice

        // Call action that adds array to correct team as key value pair

    return;
}

export default SeasonSchedule;