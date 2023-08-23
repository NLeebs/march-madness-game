// React Functions
import { useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
// State
import { teamScheduleActions } from "@/store/teamScheduleSlice";
// Constanst
import { AMOUNT_NONCONFERENCE_GAMES, AMOUNT_CONFERENCE_GAMES, AMOUNT_SEASON_GAMES } from "@/constants/CONSTANTS";


function SeasonSchedule(props) {
    const dispatch = useDispatch();

    const randomTeamSchedule = useCallback((arr, weekNo) => {
        const loopedArr = arr

        while (loopedArr.length >=2) {
            // Get and remove team 1
            const indexTeam1 = Math.floor(Math.random() * loopedArr.length);
            const team1 = loopedArr.splice(indexTeam1, 1)[0];
        
            // Get and remove team 2
            const indexTeam2 = Math.floor(Math.random() * loopedArr.length);
            const team2 = loopedArr.splice(indexTeam2, 1)[0]; 

            dispatch(teamScheduleActions.addGameToTeamSchedule({weekNumber: `week${weekNo}`, matchup: [team1, team2]}));
        }

        if(loopedArr.length > 0) return loopedArr;
    }, [dispatch]);

    // Declare function to schedule a non-conference game for every team
    const scheduleNonConferenceGames = useCallback((teamArray, weekNo) => {
        const allNCAATeamsArr = [...teamArray];
        randomTeamSchedule(allNCAATeamsArr, weekNo);
    }, [randomTeamSchedule]);

    const scheduleConferenceGames = useCallback((teamStats, weekNo) => {
        const leftoverTeamsArr = [];
        Object.keys(teamStats).forEach((conf) => {
            const confTeams = Object.keys(teamStats[conf]);
            const leftoverTeam = randomTeamSchedule(confTeams, weekNo);
            if (leftoverTeam) {
                leftoverTeamsArr.push(leftoverTeam[0]);
            };
        });
        randomTeamSchedule(leftoverTeamsArr, weekNo);

    }, [randomTeamSchedule]);

    useEffect(() => {
        if (props.teamArray.length > 0) {
            for (let i = 1; i <= AMOUNT_NONCONFERENCE_GAMES; i++) {
                scheduleNonConferenceGames(props.teamArray, i);
            }
            for (let i = AMOUNT_NONCONFERENCE_GAMES + 1; i <= AMOUNT_SEASON_GAMES; i++) {
                scheduleConferenceGames(props.teamStats, i);
            }
        }
    }, [props.teamArray, props.teamStats, scheduleNonConferenceGames, scheduleConferenceGames])

    return;
}

export default SeasonSchedule;