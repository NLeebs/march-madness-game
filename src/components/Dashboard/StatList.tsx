"use client";
import React from "react";
import { TopStatListItem, StatListItem } from "@/src/components";

interface StatListProps {
  title: string;
  statLabel: string;
  stats?: {
    team: string;
    teamLogoRoute?: string;
    stat: number | string;
  }[];
}

export const StatList = ({ title, statLabel, stats }: StatListProps) => {
  const safeStats = stats ?? [];
  const topStat = safeStats[0];
  const otherStats = safeStats.slice(1);

  if (!topStat?.team) {
    return (
      <div className="w-full bg-blue-50 px-8 py-4 rounded-md flex flex-col justify-start items-center gap-4">
        <h3 className="text-2xl text-center font-bold">{title}</h3>
        <p className="text-xl text-center text-gray-600">
          No stats available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-blue-50 px-8 py-4 rounded-md flex flex-col justify-start items-center gap-4">
      <h3 className="text-2xl text-center font-bold">{title}</h3>

      <TopStatListItem
        team={topStat.team}
        teamLogoRoute={topStat.teamLogoRoute}
        statLabel={statLabel}
        stat={topStat.stat}
      />

      {otherStats.map((stat) => (
        <StatListItem
          key={`${stat.team}-${stat.teamLogoRoute}-${stat.stat}`}
          team={stat.team}
          teamLogoRoute={stat.teamLogoRoute}
          statLabel={statLabel}
          stat={stat.stat}
        />
      ))}
    </div>
  );
};
