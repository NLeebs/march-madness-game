// Redux
import { createSlice } from "@reduxjs/toolkit";


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
                    };
                    });
            });
        },
        
    },
});

export const regularSeasonRecordActions = regularSeasonRecordSlice.actions;
export default regularSeasonRecordSlice;