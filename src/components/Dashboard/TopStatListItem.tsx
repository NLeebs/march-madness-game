"use client";
import React from "react";
import Image from "next/image";
import { useMediaQuery } from "@/src/hooks";

export interface StatListItemProps {
  team: string;
  teamLogoRoute?: string;
  statLabel: string;
  stat: number | string;
}

export const TopStatListItem: React.FC<StatListItemProps> = ({
  team,
  teamLogoRoute,
  statLabel,
  stat,
}) => {
  const isMobile = useMediaQuery("(max-width: 640px)");

  return (
    <div className="flex flex-col justify-start items-center gap-4">
      {teamLogoRoute && (
        <>
          <Image
            src={teamLogoRoute}
            alt={team ?? ""}
            width={isMobile ? 150 : 250}
            height={isMobile ? 150 : 250}
          />
          <p className="text-xl">{team}</p>
        </>
      )}
      {!teamLogoRoute && <p className="text-5xl">{team}</p>}
      <div className="w-full flex flex-row justify-center items-center gap-4">
        <p>{statLabel}:</p>
        <p>{stat}</p>
      </div>
    </div>
  );
};
