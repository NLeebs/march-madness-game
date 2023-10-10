import { createSlice } from "@reduxjs/toolkit";
// Functions
import createMatchupsFromSeededArr from "@/src/functions/seeding/createMatchupsFromSeededArr";
// Constants
import { HIGHEST_SEED } from "@/constants/CONSTANTS";

const initalState = {
    tournamentTeams: [],
    tournamentSeeds: {
        east: [],
        west: [],
        south: [],
        midwest: [],
    },
    playinTeams: {
        elevenSeeds: [],
        sixteenSeeds: [],
    },
    roundOneMatchups: {
        east: [],
        west: [],
        south: [],
        midwest: [],
        playin: {
            elevenSeeds: [],
            sixteenSeeds: [],
        },
    },
    roundTwoMatchups: {
        east: [],
        west: [],
        south: [],
        midwest: [],
    },
    roundSweetSixteenMatchups: {
        east: [],
        west: [],
        south: [],
        midwest: [],
    },
    roundEliteEightMatchups: {
        east: [],
        west: [],
        south: [],
        midwest: [],
    },
    roundFinalFourMatchups: {
        eastWest: [],
        southMidwest: [],
    },
    roundFinalsMatchups: {
        championship: [],
    },
    champion: {
        champion: [],
    },
};

// Create Team Statistics State Slice
const tournamentSlice = createSlice({
    name: "tournament",
    initialState: initalState,
    reducers: {
        addTournamentTeams(state, action) {
            state.tournamentTeams = action.payload;
        },
        setTournamentSeeds(state) {
            const seedSettingArr = [...state.tournamentTeams];
            const regions = Object.keys(state.tournamentSeeds);
            const numberOfRegions = regions.length;
            for (let i = 1; i <= HIGHEST_SEED; i++) {
                for (let j = 0; j < numberOfRegions; j++) {
                    if(i % 2 === 1) {
                        if (i === 11 && ((j === 2) || (j === 3))) {
                            state.tournamentSeeds[regions[j]].push(`playinGameSeed11Game${j-1}`)
                            seedSettingArr.splice(j, 0, "PlayinTeam")
                        }
                        else state.tournamentSeeds[regions[j]].push(seedSettingArr[j]);
                    }
                    else {
                        if (i === 16 && ((j === 0) || (j === 1))) {
                            state.tournamentSeeds[regions[j]].push(`playinGameSeed16Game${j+1}`)
                        }
                        else state.tournamentSeeds[regions[j]].push(seedSettingArr[numberOfRegions - (j + 1)]);
                    }
                }
                seedSettingArr.splice(0, 4);
            }
        },
        setPlayinTeams(state, action) {
            if (action.payload.seed === 11) state.playinTeams.elevenSeeds.push(action.payload.team);
            else if (action.payload.seed === 16) state.playinTeams.sixteenSeeds.push(action.payload.team);
        },
        setRoundOneMatchups(state) {
            Object.keys(state.tournamentSeeds).forEach((region) => {
                const unorderedMatchupArr = createMatchupsFromSeededArr(state.tournamentSeeds[region]);
                state.roundOneMatchups[region] = [unorderedMatchupArr[0], unorderedMatchupArr[7], unorderedMatchupArr[4], unorderedMatchupArr[3], unorderedMatchupArr[5], unorderedMatchupArr[2], unorderedMatchupArr[6], unorderedMatchupArr[1]];
            });
            Object.keys(state.playinTeams).forEach((playinSeed) => {
                let seedNum;
                if (playinSeed === 'elevenSeeds') seedNum = 11;
                if (playinSeed === 'sixteenSeeds') seedNum = 16;
                state.roundOneMatchups.playin[playinSeed] = createMatchupsFromSeededArr(state.playinTeams[playinSeed], seedNum);
            });
        },
        setPlayinGameResults(state, action) {
            // Set round one matchup to winning team
            if (action.payload.seedType === "elevenSeeds") {
                if (action.payload.gameIndex === 0) state.roundOneMatchups.south[4][1].team = action.payload.winningTeam;
                else state.roundOneMatchups.midwest[4][1].team = action.payload.winningTeam;
            } else {
                if (action.payload.gameIndex === 0) state.roundOneMatchups.west[0][1].team = action.payload.winningTeam;
                else state.roundOneMatchups.east[0][1].team = action.payload.winningTeam;
            }

            // Fix Past Round Object with Game Data
            for (let i = 0; i <= 1; i++) {
                if (state.roundOneMatchups.playin[action.payload.seedType][action.payload.gameIndex][i].team === action.payload.winningTeam) {
                    state.roundOneMatchups.playin[action.payload.seedType][action.payload.gameIndex][i].score = action.payload.winningScore;
                    state.roundOneMatchups.playin[action.payload.seedType][action.payload.gameIndex][i].win = true;
                } else {
                    state.roundOneMatchups.playin[action.payload.seedType][action.payload.gameIndex][i].score = action.payload.losingScore;
                    state.roundOneMatchups.playin[action.payload.seedType][action.payload.gameIndex][i].win = false;
                }
            }
        },
        setTournamentGameResults(state, action) {
            let nextRoundKey, currentRoundKey;
            if (action.payload.round === 1) {nextRoundKey = "roundTwoMatchups"; currentRoundKey = "roundOneMatchups"}

            // Add Winning Team to Next Round
            state[nextRoundKey][action.payload.results.region][action.payload.results.gameIndex] = {
                team: action.payload.results.winningTeam,
                seed: action.payload.results.seed,
            };

            // Fix Past Round Object with Game Data
            for (let i = 0; i <= 1; i++) {
                if (state[currentRoundKey][action.payload.results.region][action.payload.results.gameIndex][i].team === action.payload.results.winningTeam) {
                    state[currentRoundKey][action.payload.results.region][action.payload.results.gameIndex][i].score = action.payload.results.winningScore;
                    state[currentRoundKey][action.payload.results.region][action.payload.results.gameIndex][i].win = true;
                } else {
                    state[currentRoundKey][action.payload.results.region][action.payload.results.gameIndex][i].score = action.payload.results.losingScore;
                    state[currentRoundKey][action.payload.results.region][action.payload.results.gameIndex][i].win = false;
                }
            };
        },
    },  
});

export const tournamentActions = tournamentSlice.actions;
export default tournamentSlice;