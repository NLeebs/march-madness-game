"use client";
import React from "react";
import { BasketballSVG } from "@/src/components/Graphics";
import { PRIMARY_COLOR, SECONDARY_COLOR } from "@/src/constants";

interface LoadingBasketballProps {
  size?: number;
}

export const LoadingBasketball = ({ size = 100 }: LoadingBasketballProps) => {
  return (
    <div className="w-full flex justify-center items-center motion-safe:animate-spinEaseInOut">
      <BasketballSVG
        size={size}
        basketballColor={PRIMARY_COLOR}
        seamColor={SECONDARY_COLOR}
      />
    </div>
  );
};
