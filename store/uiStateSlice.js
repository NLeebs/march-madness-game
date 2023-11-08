import { createSlice } from "@reduxjs/toolkit";

const initalState = {};

// Create Team Statistics State Slice
const uiStateSlice = createSlice({
    name: "uiState",
    initialState: initalState,
    reducers: {
        screenSize(state, action) {
            state.screenWidth = action.payload.screenWidth;
            state.screenHeight = action.payload.screenHeight;
        },
    },
});

export const uiStateActions = uiStateSlice.actions;
export default uiStateSlice;