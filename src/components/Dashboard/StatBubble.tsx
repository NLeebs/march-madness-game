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
  const trendColor =
    trend === "up"
      ? "bg-green-200"
      : trend === "down"
        ? "bg-red-200"
        : "bg-blue-100";

  return (
    <div
      className={cn(
        "w-full px-4 py-4 flex flex-col justify-center items-center gap-2 bg-blue-50 rounded-md",
        className,
      )}
    >
      <p className="text-center">{statLabel}</p>
      <div
        className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center",
          trendColor,
        )}
      >
        <p>{percentage ? `${stat}%` : stat}</p>
      </div>
    </div>
  );
};
