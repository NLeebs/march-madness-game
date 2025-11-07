"use client";
import React from "react";
import { BasketballSVG } from "@/src/components/Graphics";
import { PRIMARY_COLOR, SECONDARY_COLOR } from "@/src/constants";

export const LoadingBasketball = () => {
  return (
    <div className="w-full flex justify-center items-center motion-safe:animate-spinEaseInOut">
      <BasketballSVG
        size={100}
        basketballColor={PRIMARY_COLOR}
        seamColor={SECONDARY_COLOR}
      />
    </div>
  );
};
