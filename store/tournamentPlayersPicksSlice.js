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
        eastWest: [[{team: "", seed: ""}, {team: "", seed: ""}]],
        southMidwest: [[{team: "", seed: ""}, {team: "", seed: ""}]],
    },
    roundFinalsPicks: {
        championship: [[{team: "", seed: ""}, {team: "", seed: ""}]],
    },
    champion: {
        champion: [[{team: "", seed: ""}]],
    }
};

const tournamentPlayersPicksSlice = createSlice({
    name: "tounramentPlayersPicks",
    initialState: initalState,
    reducers: {
        setPick(state, action) {
            let whichRound;
            let removeRoundPicksArr;
            if (action.payload.round === "1") {whichRound = "roundTwoPicks"; removeRoundPicksArr = ["roundSweetSixteenPicks", "roundEliteEightPicks", "roundFinalFourPicks", "roundFinalsPicks", "champion"];}
            if (action.payload.round === "2") {whichRound = "roundSweetSixteenPicks"; removeRoundPicksArr = ["roundEliteEightPicks", "roundFinalFourPicks", "roundFinalsPicks", "champion"];}
            if (action.payload.round === "sweet sixteen") {whichRound = "roundEliteEightPicks"; removeRoundPicksArr = ["roundFinalFourPicks", "roundFinalsPicks", "champion"];}
            if (action.payload.round === "elite eight") {whichRound = "roundFinalFourPicks"; removeRoundPicksArr = ["roundFinalsPicks", "champion"];}
            if (action.payload.round === "final four") {whichRound = "roundFinalsPicks"; removeRoundPicksArr = ["champion"];}
            if (action.payload.round === "finals") {whichRound = "champion"; removeRoundPicksArr = [];}

            // Set Pick
            if (action.payload.team !== "") {
                state[whichRound][action.payload.region][Math.floor(+action.payload.roundIndex / 2)][+action.payload.roundIndex % 2].team = action.payload.team;
                state[whichRound][action.payload.region][Math.floor(+action.payload.roundIndex / 2)][+action.payload.roundIndex % 2].seed = action.payload.seed;
            }

            // Remove erroneous future picks
            if (action.payload.opponent !== "") {
                removeRoundPicksArr.forEach((round) => {
                    Object.keys(state[round]).forEach((region) => {
                        state[round][region].forEach((matchup) => {
                            matchup.forEach((teamObj) => {
                                if (teamObj.team === action.payload.opponent) {
                                    teamObj.team = "";
                                    teamObj.seed = "";
                                }
                            });
                        });
                    });
                });
            }
        },
    },
});

export const tounramentPlayersPicksActions = tournamentPlayersPicksSlice.actions;
export default tournamentPlayersPicksSlice;