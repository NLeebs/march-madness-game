"use client";
import React from "react";

interface ButtonProps {
  onClick: () => void;
  backgroundColor: string;
  text: string;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  backgroundColor,
  text,
}) => {
  return (
    <button
      type="button"
      className="rounded-full px-6 py-4 text-lg font-semibold text-neutral-50 shadow-sm transition-transform ease-out hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-300"
      onClick={onClick}
      style={{
        backgroundColor: backgroundColor,
      }}
    >
      {text}
    </button>
  );
};
