// Redux
import { createSlice } from "@reduxjs/toolkit";


const initalState = {
    startScreen: true,
    regularSeason: false,
    selectionSunday: false,
    tournament: false,
};

// Create Team Statistics State Slice
const appStateSlice = createSlice({
    name: "appState",
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
        activateSelectionSunday(state) {
            state.selectionSunday = true;
        },
        activateTournament(state) {
            Object.keys(state).forEach((key) => state[key] = false);
            state.tournament = true;
        },
        
    },
});

export const appStateActions = appStateSlice.actions;
export default appStateSlice;