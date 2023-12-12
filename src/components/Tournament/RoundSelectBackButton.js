"use client"
// Libraries
import React from "react";
import { motion } from "framer-motion";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// State
import { uiStateActions } from "@/store/uiStateSlice";
//Components
import LeftChevronSVG from "../Graphics/LeftChevronSVG";
// Constants
import { PRIMARY_COLOR } from "@/constants/CONSTANTS";
import { XXXL_LARGE_BREAK_POINT } from "@/constants/CONSTANTS";


// Component Function
function RoundSelectBackButton(props) {
    const dispatch = useDispatch();

    const screenWidth = useSelector((state) => state.uiState.screenWidth);
    const selectedRound = useSelector((state) => state.uiState.selectedRound);

    // Send new round selection to state
    const roundSelectBackHandler = () => {
        let prevRound;
        if (selectedRound === "round2") prevRound = "round1";
        else if (selectedRound === "sweetSixteen") prevRound = "round2";
        else if (selectedRound === "eliteEight") prevRound = "sweetSixteen";
        else if (selectedRound === "finalFour") prevRound = "eliteEight";
        else if (selectedRound === "finals") prevRound = "finalFour";
        else prevRound = "round1";
        
        dispatch(uiStateActions.selectRound({
            newRound: prevRound,
        }))
    }

  return (
    <div>
        {selectedRound !== "round1" && screenWidth <= XXXL_LARGE_BREAK_POINT &&
            <motion.button 
                onClick={roundSelectBackHandler}
                className="relative w-roundSelectBackButton h-16 flex justify-center items-center text-center bg-slate-100"
            >
                <LeftChevronSVG />
            </motion.button>
        }
    </div>
   );
}

export default RoundSelectBackButton;