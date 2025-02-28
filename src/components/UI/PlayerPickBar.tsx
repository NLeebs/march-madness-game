"use client";
import React from "react";
import { TournamentRound } from "@/types";

interface PlayerPickBarProps {
  team: string;
  pick: string;
  round: TournamentRound;
}

export const PlayerPickBar: React.FC<PlayerPickBarProps> = ({
  team,
  pick,
  round,
}) => {
  return (
    <div
      className={`w-full flex flex-row justify-center items-center h-5 text-sm text-center 
          ${!pick && "bg-slate-200"}  
          ${team === pick && "bg-green-100 text-green-700"}
          ${team !== pick && "bg-red-100 text-red-700 line-through"}
          ${round === "champion" && "absolute top-[-1.25rem]"}
        `}
    >
      {pick}
    </div>
  );
};
