"use client"
// Libraries
import React from "react";
// Icons
import { TrophyIcon } from '@heroicons/react/24/solid'
import { CheckIcon } from '@heroicons/react/24/solid'
// Constants
import { CONFIRMATION_GREEN } from "@/constants/CONSTANTS";



// Component Function
function PingNotification(props) {
  

    return (
        <div 
            className="absolute flex justify-center items-center p-1 -top-2 -right-2 rounded-full"
            style={{backgroundColor: CONFIRMATION_GREEN,}}
        >
            {props.icon === "trophy" && <TrophyIcon className="h-4 w-4 text-slate-50" />}
            {props.icon === "check" && <CheckIcon className="h-4 w-4 text-slate-50" />}
        </div>
    );
}

export default PingNotification;