"use client";
import React from "react";
import { cn } from "@/src/utils";
interface LineSpacerProps {
  lineColor: string;
}

export const LineSpacer = ({ lineColor }: LineSpacerProps) => {
  const borderColor = `border-[${lineColor}]`;

  return <hr className={cn("w-full my-6 border-t opacity-50", borderColor)} />;
};
