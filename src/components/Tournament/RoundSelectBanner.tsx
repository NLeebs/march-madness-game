"use client";
import React from "react";
import { RoundSelectBackButton, RoundSelectButton } from "@/src/components";

export const RoundSelectBanner = () => {
  return (
    <div
      id="roundSelectionBar"
      className="w-full flex flex-row justify-start overflow-x-auto bg-slate-100 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      <div className="flex flex-row items-center">
        <RoundSelectBackButton />
        <RoundSelectButton round={1} buttonText="Round of 64" />
        <RoundSelectButton round={2} buttonText="Round of 32" />
        <RoundSelectButton round={"sweet sixteen"} buttonText="Sweet Sixteen" />
        <RoundSelectButton round={"elite eight"} buttonText="Elite Eight" />
        <RoundSelectButton round={"final four"} buttonText="Final Four" />
        <RoundSelectButton round={"finals"} buttonText="Finals" />
      </div>
    </div>
  );
};
