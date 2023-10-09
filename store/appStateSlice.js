// Redux
import { createSlice } from "@reduxjs/toolkit";


const initalState = {
    startScreen: true,
    regularSeason: false,
    selectionSunday: false,
    tournament: false,
    tournamentSelection: false,
    tournamentPlayPlayinGames: false,
    tournamentPlayGames: false,
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
        activateTournamentSelectionStage(state) {
            state.tournamentSelection = true;
        },
        activateTournamentPlayinGamesState(state) {
            state.tournamentSelection = false;
            state.tournamentPlayPlayinGames = true;
        },
        activateTournamentStandardGames(state) {
            state.tournamentPlayPlayinGames = false;
            state.tournamentPlayGames = true;

        }
        
    },
});

export const appStateActions = appStateSlice.actions;
export default appStateSlice;