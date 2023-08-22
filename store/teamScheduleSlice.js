import { createSlice } from "@reduxjs/toolkit";

const initalState = {
    teamArray: [],
    teamSchedules: {},
};

// Create Team Statistics State Slice
const teamScheduleSlice = createSlice({
    name: "teamSchedule",
    initialState: initalState,
    reducers: {
        teamScheduleConfig(state, action) {
            // Make Large Team Array
            state.teamArray = [];
            const conferences = Object.keys(action.payload);
            conferences.forEach((conf) => {
                state.teamArray = state.teamArray.concat(Object.keys(action.payload[conf]));
            });

            // Make Team Schedule Object
            state.teamSchedules = {};
            for (let i = 1; i <= 20; i++) {
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