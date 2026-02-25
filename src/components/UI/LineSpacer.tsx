"use client";
import React from "react";
import { cn } from "@/src/utils";
interface LineSpacerProps {
  lineColor: string;
}

export const LineSpacer = ({ lineColor }: LineSpacerProps) => {
  return (
    <hr
      style={{ borderColor: lineColor }}
      className="w-full my-6 border-t opacity-50"
    />
  );
};
