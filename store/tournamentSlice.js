import { createSlice } from "@reduxjs/toolkit";

const initalState = {};

// Create Team Statistics State Slice
const tournamentSlice = createSlice({
    name: "tournament",
    initialState: initalState,
    reducers: {
        addTournamentTeams(state, action) {
            console.log(action.payload);
            state.tournamentTeams = action.payload;
        },
    },
});

export const tournamentActions = tournamentSlice.actions;
export default tournamentSlice;