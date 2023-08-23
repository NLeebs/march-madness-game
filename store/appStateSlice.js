// Redux
import { createSlice } from "@reduxjs/toolkit";


const initalState = {
    startScreen: true,
    regularSeason: false,
    tournament: false,
};

// Create Team Statistics State Slice
const appStateSlice = createSlice({
    name: "appStateSlice",
    initialState: initalState,
    reducers: {
        activateStartScreen(state) {
            Object.keys(state).forEach((key) => state[key] = false);
            state.startScreen = true;
        },
        activateRegularSeason(state) {
            Object.keys(state).forEach((key) => state[key] = false);
            state.regularSeason = true;
        },
        activateTournament(state) {
            Object.keys(state).forEach((key) => state[key] = false);
            state.tournament = true;
        },
        
    },
});

export const appStateActions = appStateSlice.actions;
export default appStateSlice;