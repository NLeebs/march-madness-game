// Redux
import { createSlice } from "@reduxjs/toolkit";
// Constants
import { AMOUNT_SEASON_GAMES } from "@/constants/CONSTANTS";


const initalState = {
    teamArray: [],
    teamSchedules: {},
};

// Create Team Statistics State Slice
const teamScheduleSlice = createSlice({
    name: "teamSchedule",
    initialState: initalState,
    reducers: {
        restartGame: () => initalState,
        teamScheduleConfig(state, action) {
            // Make Large Team Array
            state.teamArray = [];
            const conferences = Object.keys(action.payload);
            conferences.forEach((conf) => {
                const teams = Object.keys(action.payload[conf]);
                teams.forEach((team) => {
                    state.teamArray.push(
                        {
                            team: team,
                            conference: conf,
                        });
                    });
            });

            // Make Team Schedule Object
            state.teamSchedules = {};
            for (let i = 1; i <= AMOUNT_SEASON_GAMES; i++) {
               const key = `week${i}`;
                state.teamSchedules[key] = [];
            }
        },
        addGameToTeamSchedule(state, action) {
            // payload should be object like {week: weekNumber, matchups: [team1, team2]}
            state.teamSchedules[action.payload.weekNumber].push(action.payload.matchup);
        }
    },
});

export const teamScheduleActions = teamScheduleSlice.actions;
export default teamScheduleSlice;