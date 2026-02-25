"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface StatBubbleProps {
  statLabel: string;
  stat: number | string;
  percentage?: boolean;
  trend?: "up" | "down";
  className?: string;
}

export const StatBubble: React.FC<StatBubbleProps> = ({
  statLabel,
  stat,
  percentage,
  trend,
  className,
}) => {
  const shownStat = stat
    ? percentage
      ? `${stat}%`
      : stat
    : percentage
      ? "0%"
      : "--";

  const trendColor =
    trend === "up"
      ? "bg-green-200"
      : trend === "down"
        ? "bg-red-200"
        : "bg-blue-100";

  return (
    <div
      className={cn(
        "px-4 py-4 flex flex-col justify-center items-center gap-2",
        className,
      )}
    >
      <p className="text-center">{statLabel}</p>
      <div
        className={cn(
          "w-32 h-32 rounded-full flex items-center justify-center",
          trendColor,
        )}
      >
        <p className="text-xl">{shownStat}</p>
      </div>
    </div>
  );
};
