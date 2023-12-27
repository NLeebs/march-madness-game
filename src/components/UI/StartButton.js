"use client"
// Libraries
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";
// Functions
import delay from "@/src/functions/generic/delay";
// Components
import BasketballSVG from "../Graphics/BasketballSVG";
// Constants
import { 
        SMALL_BREAK_POINT, 
        LARGE_BREAK_POINT, 
        PRIMARY_COLOR, 
        SECONDARY_COLOR, 
        TIMER_BETWEEN_APP_STATES } from "@/constants/CONSTANTS";


// Component Function
function StartButton(props) {
  const dispatch = useDispatch();

  const screenWidth = useSelector((state) => state.uiState.screenWidth);

  const [elRotation, setElRotation] = useState("");

  const appState = useSelector((state) => state.appState);
  const isLoading = useSelector((state) => state.appState.loading);

  useEffect(() => {
    // Define Mose Move Handler
    const handleMouseMove = (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const elAngleRadians = Math.atan2(e.clientY - centerY, e.clientX - centerX); 
      const elAngleDegrees = ((elAngleRadians * 180) / Math.PI + "");
  
      if (appState.transition) return; 
      setElRotation(elAngleDegrees);
    }

    // Set Event Listeners
    if (screenWidth >= LARGE_BREAK_POINT) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [screenWidth, appState.transition]);

  const activateRegularSeason = async () => {
    dispatch(appStateActions.activateTransition());
    await  Promise.all([delay(TIMER_BETWEEN_APP_STATES)]).then(() => {
      dispatch(appStateActions.activateRegularSeason())
    });
  }

  return (
    <motion.button 
      onClick={activateRegularSeason}
      disabled={isLoading}
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      className={`relative rounded-full transition-transform ease-out ${appState.transition ? "motion-safe:animate-startTheGameBasketball" : "hover:scale-110"} focus-visible:outline-neutral-300`}
    >
      <div 
        className={`absolute inset-0 w-full h-full z-10 flex justify-center items-center rounded-full ${isLoading ? "opacity-50" : "opacity-20"}`}
        style={{
          backgroundColor: `${isLoading ? "#d1d5db" : PRIMARY_COLOR}`,
        }}
      >
      </div>
      <div className={`absolute inset-0 w-full h-full z-10 flex justify-center items-center rounded-full`}>
        <h2 className={`text-6xl md:text-7xl ${!isLoading && "text-neutral-50"}`}>
          {isLoading ? "Loading..." : "Start"}
        </h2>
      </div>
      <div 
        className={`${isLoading && 'motion-safe:animate-spin'}`}
        style={{ transform: !isLoading && `rotate(${elRotation}deg)`}}
      >
        <BasketballSVG size={screenWidth >= SMALL_BREAK_POINT ? "400" : "300"} 
          basketballColor={PRIMARY_COLOR} 
          seamColor={SECONDARY_COLOR} 
        />
      </div>
    </motion.button>);
}

export default StartButton;