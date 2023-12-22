"use client"
// Libraries
import React from "react";

// Component Function
function PlayerPickBar(props) {

  return (
    <div className={`w-full flex flex-row justify-center items-center h-5 text-sm text-center 
          ${!props.pick && "bg-slate-200"}  
          ${props.team === props.pick && "bg-green-100 text-green-700"}
          ${props.team !== props.pick && "bg-red-100 text-red-700 line-through"}
          ${props.round === "champion" && "absolute top-[-1.25rem]"}
        `}
    >
        {props.pick}
    </div>
  );
}

export default PlayerPickBar;