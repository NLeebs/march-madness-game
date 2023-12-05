import { createSlice } from "@reduxjs/toolkit";

const initalState = {
    selectedRound: "round1"
};

// Create Team Statistics State Slice
const uiStateSlice = createSlice({
    name: "uiState",
    initialState: initalState,
    reducers: {
        screenSize(state, action) {
            state.screenWidth = action.payload.screenWidth;
            state.screenHeight = action.payload.screenHeight;
        },
        selectRound(state, action) {
            state.selectedRound = action.payload.newRound;
        }
    },
});

export const uiStateActions = uiStateSlice.actions;
export default uiStateSlice;