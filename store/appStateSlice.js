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
    tournamentPlayRoundOne: false,
    tournamentPlayRoundTwo: false,
    tournamentPlaySweetSixteen: false,
    tournamentPlayEliteEight: false,
    tournamentPlayFinalFour: false,
    tournamentPlayFinals: false,
    tournamentRecap: false,
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
            state.tournamentPlayRoundOne = true;
        },
        activateTournamentRoundTwo(state) {
            state.tournamentPlayRoundTwo = true;
        },
        activateTournamentSweetSixteen(state) {
            state.tournamentPlaySweetSixteen = true;
        },
        activateTournamentEliteEight(state) {
            state.tournamentPlayEliteEight = true;
        },
        activateTournamentFinalFour(state) {
            state.tournamentPlayFinalFour = true;
        },
        activateTournamentFinals(state) {
            state.tournamentPlayFinals = true;
        },
        activateTournamentRecap(state) {
            state.tournamentRecap = true;
        },
        
    },
});

export const appStateActions = appStateSlice.actions;
export default appStateSlice;