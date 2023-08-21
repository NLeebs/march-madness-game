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
            conferences.forEach((conf) => {
                Object.keys(action.payload[conf]).forEach((team) => {
                    state.teamSchedules[team] = [];
                });
            });
        },
    },
});

export const teamScheduleActions = teamScheduleSlice.actions;
export default teamScheduleSlice;