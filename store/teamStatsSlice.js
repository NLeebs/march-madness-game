import { createSlice } from "@reduxjs/toolkit";

const initalState = {
    conferenceArrays: {},
};

// Create Team Statistics State Slice
const teamStatsSlice = createSlice({
    name: "teamStats",
    initialState: initalState,
    reducers: {
        addToStateFromDB(state, action) {
            state.teamStats = {...action.payload}
        },
        addConferenceArrays(state, action) {
            Object.keys(action.payload).forEach((conf) => {
                state.conferenceArrays[conf] = Object.keys(action.payload[conf]);
            })
        }
    },
});

export const teamStatsActions = teamStatsSlice.actions;
export default teamStatsSlice;
