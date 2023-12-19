"use client"
// Libraries
import React from "react";
import { motion } from "framer-motion";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// State
import { uiStateActions } from "@/store/uiStateSlice";
// Constants
import { PRIMARY_COLOR, PRIMARY_TEXT_COLOR, DEFAULT_FONT_SIZE } from "@/constants/CONSTANTS";
import { XXXL_LARGE_BREAK_POINT,
        XXL_LARGE_BREAK_POINT,
        XL_LARGE_BREAK_POINT,
        LARGE_BREAK_POINT,
        MEDIUM_BREAK_POINT} from "@/constants/CONSTANTS";
import { TOURNAMENT_ROUND_COLUMN_WIDTH,
        TOURNAMENT_ROUND_BUTTON_WITH_BACK_BUTTON_WIDTH,
        NON_CTA_BUTTON_COLOR} from "@/constants/CONSTANTS";


// Component Function
function RoundSelectButton(props) {
    const dispatch = useDispatch();

    const screenWidth = useSelector((state) => state.uiState.screenWidth);
    const selectedRound = useSelector((state) => state.uiState.selectedRound);


    // Send new round selection to state
    const roundSelectHandler = () => {
        const roundSelectionBarEl = document.getElementById("roundSelectionBar");
        roundSelectionBarEl.scrollLeft = 0;
        
        dispatch(uiStateActions.selectRound({
            newRound: props.round,
        }))
    }


    // Animations if it is the selected round
    let accentLineScale, accentLinePosition, accentLineBackgroundColor;
    if (props.round === selectedRound) {
        accentLineScale = 1; accentLinePosition = 0; accentLineBackgroundColor = PRIMARY_COLOR;
    } 
    else {
        accentLineScale = 0; accentLinePosition = "50%"; accentLineBackgroundColor = NON_CTA_BUTTON_COLOR;
    }


    // Animation variables for rounds other than selected
    let roundSelectButtonWidth, roundSelectButtonTextColor, roundSelectButtonFontSize;
    const setButtonShrinkStyles = () => {
        roundSelectButtonWidth = 0; 
        roundSelectButtonTextColor = NON_CTA_BUTTON_COLOR; 
        roundSelectButtonFontSize = 0;
    }
    const setButtonDefaultStyles = () => {
        roundSelectButtonWidth = TOURNAMENT_ROUND_BUTTON_WITH_BACK_BUTTON_WIDTH;
    }

    if (screenWidth <= XXXL_LARGE_BREAK_POINT && screenWidth > XXL_LARGE_BREAK_POINT) {
        if ((selectedRound === "round2" || selectedRound === "sweetSixteen" || selectedRound === "eliteEight" || selectedRound === "finalFour" || selectedRound === "finals") && props.round === "round1") {
            setButtonShrinkStyles();
        }
        else if ((selectedRound === "round2" || selectedRound === "sweetSixteen" || selectedRound === "eliteEight" || selectedRound === "finalFour" || selectedRound === "finals") && props.round === "round2") {
            setButtonDefaultStyles();
        }
    }
    else if (screenWidth <= XXL_LARGE_BREAK_POINT && screenWidth > XL_LARGE_BREAK_POINT) {
        if (((selectedRound === "round2" && props.round !== "round2") || selectedRound === "sweetSixteen" || selectedRound === "eliteEight" || selectedRound === "finalFour" || selectedRound === "finals") && (props.round === "round1" || props.round === "round2")) {
            setButtonShrinkStyles();
        }
        else if ((selectedRound === "round2" && props.round === "round2") || ((selectedRound === "sweetSixteen" || selectedRound === "eliteEight" || selectedRound === "finalFour" || selectedRound === "finals") && props.round === "sweetSixteen")) {
            setButtonDefaultStyles();
        }
    }
    else if (screenWidth <= XL_LARGE_BREAK_POINT && screenWidth > LARGE_BREAK_POINT) {
        if (((selectedRound === "round2" && props.round !== "round2" && props.round !== "sweetSixteen") || (selectedRound === "sweetSixteen" && props.round !== "sweetSixteen") || selectedRound === "eliteEight" || selectedRound === "finalFour" || selectedRound === "finals") && (props.round === "round1" || props.round === "round2" || props.round === "sweetSixteen")) {
            setButtonShrinkStyles();
        }
        else if ((selectedRound === "round2" && props.round === "round2") || (selectedRound === "sweetSixteen" && props.round === "sweetSixteen") || ((selectedRound === "eliteEight" || selectedRound === "finalFour" || selectedRound === "finals") && props.round === "eliteEight")) {
            setButtonDefaultStyles();
        }
    }
    else if (screenWidth <= LARGE_BREAK_POINT && screenWidth > MEDIUM_BREAK_POINT) {
        if (((selectedRound === "round2" && props.round !== "round2" && props.round !== "sweetSixteen" && props.round !== "eliteEight") || (selectedRound === "sweetSixteen" && props.round !== "sweetSixteen" && props.round !== "eliteEight") || (selectedRound === "eliteEight" && props.round !== "eliteEight") || selectedRound === "finalFour" || selectedRound === "finals") && (props.round === "round1" || props.round === "round2" || props.round === "sweetSixteen" || props.round === "eliteEight")) {
            setButtonShrinkStyles();
        }
        else if ((selectedRound === "round2" && props.round === "round2") || (selectedRound === "sweetSixteen" && props.round === "sweetSixteen") || (selectedRound === "eliteEight" && props.round === "eliteEight") || ((selectedRound === "finalFour" || selectedRound === "finals") && props.round === "finalFour")) {
            setButtonDefaultStyles();
        }
    }
    else if (screenWidth <= MEDIUM_BREAK_POINT) {
        if (((selectedRound === "round2" && props.round !== "round2" && props.round !== "sweetSixteen" && props.round !== "eliteEight" && props.round !== "finalFour") || (selectedRound === "sweetSixteen" && props.round !== "sweetSixteen" && props.round !== "eliteEight" && props.round !== "finalFour") || (selectedRound === "eliteEight" && props.round !== "eliteEight" && props.round !== "finalFour") || (selectedRound === "finalFour" && props.round !== "finalFour") || selectedRound === "finals") && (props.round === "round1" || props.round === "round2" || props.round === "sweetSixteen" || props.round === "eliteEight" || props.round === "finalFour")) {
            setButtonShrinkStyles();
        }
        else if ((selectedRound === "round2" && props.round === "round2") || (selectedRound === "sweetSixteen" && props.round === "sweetSixteen") || (selectedRound === "eliteEight" && props.round === "eliteEight") || (selectedRound === "finalFour" && props.round === "finalFour") || (selectedRound === "finals" && props.round === "finals")) {
            setButtonDefaultStyles();
        }

    }
    else {
        setButtonDefaultStyles();
    }


    //JSX
    return (
        <div>
            <motion.button 
                onClick={roundSelectHandler}
                initial={{
                    width: TOURNAMENT_ROUND_COLUMN_WIDTH,
                    color: PRIMARY_TEXT_COLOR,
                    fontSize: DEFAULT_FONT_SIZE,
                    }}
                animate={{
                    width: roundSelectButtonWidth,
                    color: roundSelectButtonTextColor,
                    fontSize: roundSelectButtonFontSize,
                }}
                className={`relative h-16 text-center`}
                style={{backgroundColor: NON_CTA_BUTTON_COLOR,}}
            >
                {props.buttonText}
                <motion.div
                    className="absolute bottom-0 left-1/2 origin-left w-full h-1"
                    initial={{ 
                        scaleX: 0, 
                        left: "50%", 
                        backgroundColor: "transparent", 
                }} 
                    animate={{ 
                        scaleX: accentLineScale, 
                        left: accentLinePosition, 
                        backgroundColor: accentLineBackgroundColor, 
                    }} 
                    transition={{ duration: 0.25 }} 
                />
            </motion.button>
        </div>
    );
}

export default RoundSelectButton;