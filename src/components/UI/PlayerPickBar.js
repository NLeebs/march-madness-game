"use client"
// Libraries
import React from "react";
// React Functions
import { useSelector } from "react-redux";

// TODO: Pick of the playin team displays as "playinGameSeed11Game1" or the like
// Component Function
function PlayerPickBar(props) {
  const appState = useSelector((state) => state.appState);

  return (
    <div className={`w-full flex flex-row justify-center items-center h-5 text-sm text-center 
        ${!props.pick && "bg-slate-200"}  
        ${props.team === props.pick && "bg-green-100 text-green-700"}
        ${props.team !== props.pick && "bg-red-100 text-red-700 line-through"}`}
    >
        {props.pick}
    </div>
  );
}

export default PlayerPickBar;