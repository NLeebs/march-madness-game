import { createSlice } from "@reduxjs/toolkit";

const initalState = {};

// Create Team Statistics State Slice
const teamStatsSlice = createSlice({
    name: "teamStats",
    initialState: initalState,
    reducers: {
        addToStateFromDB(state, action) {
            state.teamStats = {...action.payload}
        },
    },
});

export const teamStatsActions = teamStatsSlice.actions;
export default teamStatsSlice;
