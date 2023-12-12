"use client"
// Libraries
import React from "react";
// Components
import RoundSelectBackButton from "./RoundSelectBackButton";
import RoundSelectButton from "./RoundSelectButton";
import { useSelector } from "react-redux";


// Component Function
function RoundSelectBanner() {

  const selectedRound = useSelector((state) => state.uiState.selectedRound);

  return (
    <div 
      id="roundSelectionBar"
      className={`w-screen flex flex-row justify-start overflow-x-scroll scrollable-container bg-slate-100`}
    >
        <RoundSelectBackButton />
        <RoundSelectButton round={"round1"} buttonText="Round of 64" />
        <RoundSelectButton round={"round2"} buttonText="Round of 32" />
        <RoundSelectButton round={"sweetSixteen"} buttonText="Sweet Sixteen" />
        <RoundSelectButton round={"eliteEight"} buttonText="Elite Eight" />
        <RoundSelectButton round={"finalFour"} buttonText="Final Four" />
        <RoundSelectButton round={"finals"} buttonText="Finals" />
    </div>
   )
}

export default RoundSelectBanner;