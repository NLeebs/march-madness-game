"use client";
import React from "react";
import { cn } from "@/src/utils";

interface ButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  backgroundColor: string;
  text: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  backgroundColor,
  text,
  type = "button",
  disabled = false,
  className = "",
  icon,
}) => {
  return (
    <button
      type={type}
      className={cn(
        "flex flex-row items-center gap-2 rounded-full px-6 py-4 text-lg font-semibold text-neutral-50 shadow-sm transition-transform ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-300",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-110",
        className
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        backgroundColor: backgroundColor,
      }}
    >
      {icon}
      {text}
    </button>
  );
};
