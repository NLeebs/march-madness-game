"use client";
import React from "react";
import { StatListItemProps } from "./TopStatListItem";
import Image from "next/image";

export const StatListItem: React.FC<StatListItemProps> = ({
  team,
  teamLogoRoute,
  statLabel,
  stat,
}) => {
  return (
    <div className="w-full px-4 py-2 flex flex-col gap-2 border-t border-gray-300">
      {teamLogoRoute && (
        <div className="flex flex-row justify-center items-center gap-4">
          <Image src={teamLogoRoute} alt={team ?? ""} width={64} height={64} />
          <p className="text-wrap text-center">{team}</p>
        </div>
      )}
      {!teamLogoRoute && (
        <p className="w-full text-3xl text-wrap text-center">{team}</p>
      )}
      <div className="flex flex-row justify-center items-center gap-4">
        <p>{statLabel}:</p>
        <p>{stat}</p>
      </div>
    </div>
  );
};
