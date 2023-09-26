import { createSlice } from "@reduxjs/toolkit";

const initalState = {
    playerScore: 0,
    roundTwoPicks: {
        east: [[{team: "", seed: ""}, {team: "", seed: ""}], [{team: "", seed: ""}, {team: "", seed: ""}],  [{team: "", seed: ""}, {team: "", seed: ""}],  [{team: "", seed: ""}, {team: "", seed: ""}]],
        west: [[{team: "", seed: ""}, {team: "", seed: ""}], [{team: "", seed: ""}, {team: "", seed: ""}],  [{team: "", seed: ""}, {team: "", seed: ""}],  [{team: "", seed: ""}, {team: "", seed: ""}]],
        south: [[{team: "", seed: ""}, {team: "", seed: ""}], [{team: "", seed: ""}, {team: "", seed: ""}],  [{team: "", seed: ""}, {team: "", seed: ""}],  [{team: "", seed: ""}, {team: "", seed: ""}]],
        midwest: [[{team: "", seed: ""}, {team: "", seed: ""}], [{team: "", seed: ""}, {team: "", seed: ""}],  [{team: "", seed: ""}, {team: "", seed: ""}],  [{team: "", seed: ""}, {team: "", seed: ""}]],
    },
    roundSweetSixteenPicks: {
        east: [[{team: "", seed: ""}, {team: "", seed: ""}], [{team: "", seed: ""}, {team: "", seed: ""}]],
        west: [[{team: "", seed: ""}, {team: "", seed: ""}], [{team: "", seed: ""}, {team: "", seed: ""}]],
        south: [[{team: "", seed: ""}, {team: "", seed: ""}], [{team: "", seed: ""}, {team: "", seed: ""}]],
        midwest: [[{team: "", seed: ""}, {team: "", seed: ""}], [{team: "", seed: ""}, {team: "", seed: ""}]],
    },
    roundEliteEightPicks: {
        east: [[{team: "", seed: ""}, {team: "", seed: ""}]],
        west: [[{team: "", seed: ""}, {team: "", seed: ""}]],
        south: [[{team: "", seed: ""}, {team: "", seed: ""}]],
        midwest: [[{team: "", seed: ""}, {team: "", seed: ""}]],
    },
    roundFinalFourPicks: {
        eastSouth: [[{team: "", seed: ""}, {team: "", seed: ""}]],
        westMidwest: [[{team: "", seed: ""}, {team: "", seed: ""}]],
    },
    roundFinalsPicks: {
        championship: [[{team: "", seed: ""}, {team: "", seed: ""}]],
    },
};

const tournamentPlayersPicksSlice = createSlice({
    name: "tounramentPlayersPicks",
    initialState: initalState,
    reducers: {
        setPick(state, action) {

        },
    },
});

export const tounramentPlayersPicksActions = tournamentPlayersPicksSlice.actions;
export default tournamentPlayersPicksSlice;