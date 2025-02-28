"use client";
import React from "react";
import { TrophyIcon, CheckIcon } from "@heroicons/react/24/solid";
import { CONFIRMATION_GREEN } from "@/src/constants";

interface PingNotificationProps {
  icon: "trophy" | "check";
}

export const PingNotification: React.FC<PingNotificationProps> = ({ icon }) => {
  return (
    <div
      className="absolute flex justify-center items-center p-1 -top-2 -right-2 rounded-full"
      style={{ backgroundColor: CONFIRMATION_GREEN }}
    >
      {icon === "trophy" && <TrophyIcon className="h-4 w-4 text-slate-50" />}
      {icon === "check" && <CheckIcon className="h-4 w-4 text-slate-50" />}
    </div>
  );
};
