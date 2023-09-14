// Redux
import { createSlice } from "@reduxjs/toolkit";
//Constants
import { NUMBER_OF_TEAMS } from "@/constants/CONSTANTS";


const initalState = {
    records: {},
};

// Create Team Statistics State Slice
const regularSeasonRecordSlice = createSlice({
    name: "regularSeasonRecords",
    initialState: initalState,
    reducers: {
        regularSeasonRecordConfig(state, action) {
            const conferences = Object.keys(action.payload);
            conferences.forEach((conf) => {
                const teams = Object.keys(action.payload[conf]);
                teams.forEach((team) => {
                    state.records[team] = {
                        wins: 0,
                        losses: 0,
                        tournamentSelectionScore: 0,
                    };
                    });
            });
        },
        addRegularSeasonGameResult(state, action) {
            if (action.payload.favoredScore > action.payload.underdogScore) {
                state.records[action.payload.favoredTeam].wins++;
                state.records[action.payload.underdogTeam].losses++;
                state.records[action.payload.favoredTeam].tournamentSelectionScore += NUMBER_OF_TEAMS - action.payload.underdogRPI;
            } else {
                state.records[action.payload.underdogTeam].wins++;
                state.records[action.payload.favoredTeam].losses++;
                state.records[action.payload.underdogTeam].tournamentSelectionScore += NUMBER_OF_TEAMS - action.payload.favoredRPI;
            }  
        }
        
    },
});

export const regularSeasonRecordActions = regularSeasonRecordSlice.actions;
export default regularSeasonRecordSlice;