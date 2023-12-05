"use client"
// Libraries
import React from "react";
// Components
import RoundSelectButton from "./RoundSelectButton";


// Component Function
function RoundSelectBanner() {

  return (
    <div className={`w-screen flex flex-row overflow-x-scroll scrollable-container`}>
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