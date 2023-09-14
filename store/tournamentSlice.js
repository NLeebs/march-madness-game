import { createSlice } from "@reduxjs/toolkit";
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
    }
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
                            state.tournamentSeeds[regions[j]].push(`playinGameSeed11Game${j+1}`)
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
    },  
});

export const tournamentActions = tournamentSlice.actions;
export default tournamentSlice;