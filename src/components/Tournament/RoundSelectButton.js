"use client"
// Libraries
import React from "react";
// React Functions
import { useDispatch } from "react-redux";
// State
import { uiStateActions } from "@/store/uiStateSlice";


// Component Function
function RoundSelectButton(props) {

    const dispatch = useDispatch();

    const roundSelectHandler = () => {
        dispatch(uiStateActions.selectRound({
            newRound: props.round,
        }))
    }

  return (
    <div>
        <button 
            onClick={roundSelectHandler}
            className="w-tournamentRoundColumn p-8 text-center bg-slate-100"
        >
            {props.buttonText}
        </button>
    </div>
   );
}

export default RoundSelectButton;