"use client";
import React from "react";

interface ButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  backgroundColor: string;
  text: string;
  disabled?: boolean;
  type?: "button" | "submit";
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  backgroundColor,
  text,
  type = "button",
  disabled = false,
}) => {
  return (
    <button
      type={type}
      className={`rounded-full px-6 py-4 text-lg font-semibold text-neutral-50 shadow-sm transition-transform ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-300 ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-110"
      }`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        backgroundColor: backgroundColor,
      }}
    >
      {text}
    </button>
  );
};
