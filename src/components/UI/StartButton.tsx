"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { RootState, appStateActions } from "@/store";
import { delay } from "@/src/functions";
import { BasketballSVG } from "@/src/components/Graphics";
import {
  SMALL_BREAK_POINT,
  LARGE_BREAK_POINT,
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  TIMER_BETWEEN_APP_STATES,
} from "@/src/constants";

export const StartButton = () => {
  const dispatch = useDispatch();

  const screenWidth = useSelector<RootState, number>(
    (state) => state.uiState.screenWidth
  );

  const [elRotation, setElRotation] = useState("");

  const isTranstion = useSelector<RootState, boolean>(
    (state) => state.appState.transition
  );
  const isLoading = useSelector<RootState, boolean>(
    (state) => state.appState.loading
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const elAngleRadians = Math.atan2(
        e.clientY - centerY,
        e.clientX - centerX
      );
      const elAngleDegrees = (elAngleRadians * 180) / Math.PI + "";

      if (isTranstion) return;
      setElRotation(elAngleDegrees);
    };

    if (screenWidth >= LARGE_BREAK_POINT) {
      window.addEventListener("mousemove", handleMouseMove);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
      };
    }
  }, [screenWidth, isTranstion]);

  const activateRegularSeason = async () => {
    dispatch(appStateActions.activateTransition());
    await Promise.all([delay(TIMER_BETWEEN_APP_STATES)]).then(() => {
      dispatch(appStateActions.activateRegularSeason());
    });
  };

  return (
    <motion.button
      onClick={activateRegularSeason}
      disabled={isLoading}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative rounded-full transition-transform ease-out ${
        isTranstion
          ? "motion-safe:animate-startTheGameBasketball"
          : "hover:scale-110"
      } focus-visible:outline-neutral-300`}
    >
      <div
        className={`absolute inset-0 w-full h-full z-10 flex justify-center items-center rounded-full ${
          isLoading ? "opacity-50" : "opacity-20"
        }`}
        style={{
          backgroundColor: `${isLoading ? "#d1d5db" : PRIMARY_COLOR}`,
        }}
      ></div>
      <div
        className={`absolute inset-0 w-full h-full z-10 flex justify-center items-center rounded-full`}
      >
        <h2
          className={`text-6xl md:text-7xl ${!isLoading && "text-neutral-50"}`}
        >
          {isLoading ? "Loading..." : "Start"}
        </h2>
      </div>
      <div
        className={`${isLoading && "motion-safe:animate-spin"}`}
        style={{ transform: !isLoading && `rotate(${elRotation}deg)` }}
      >
        <BasketballSVG
          size={screenWidth >= SMALL_BREAK_POINT ? 400 : 300}
          basketballColor={PRIMARY_COLOR}
          seamColor={SECONDARY_COLOR}
        />
      </div>
    </motion.button>
  );
};
