"use client";
import React from "react";
import { RoundSelectBackButton, RoundSelectButton } from "@/src/components";

export const RoundSelectBanner = () => {
  return (
    <div
      id="roundSelectionBar"
      className={`w-screen flex flex-row justify-start overflow-x-scroll scrollable-container bg-slate-100`}
    >
      <RoundSelectBackButton />
      <RoundSelectButton round={1} buttonText="Round of 64" />
      <RoundSelectButton round={2} buttonText="Round of 32" />
      <RoundSelectButton round={"sweet sixteen"} buttonText="Sweet Sixteen" />
      <RoundSelectButton round={"elite eight"} buttonText="Elite Eight" />
      <RoundSelectButton round={"final four"} buttonText="Final Four" />
      <RoundSelectButton round={"finals"} buttonText="Finals" />
    </div>
  );
};
