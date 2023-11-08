"use client"
// Libraries
import React, { useEffect, useState } from "react";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// State
import { appStateActions } from "@/store/appStateSlice";
// Componenets
import BasketballSVG from "../Graphics/BasketballSVG";
// Constants
import { SMALL_BREAK_POINT, LARGE_BREAK_POINT, BASKETBALL_COLOR, BASKETBALL_SEAM_COLOR } from "@/constants/CONSTANTS";


// Component Function
function StartButton() {
  const dispatch = useDispatch();

  const screenWidth = useSelector((state) => state.uiState.screenWidth);

  const [elRotation, setElRotation] = useState("");

  const isLoading = useSelector((state) => state.appState.loading);

  const handleMouseMove = (e) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const elAngleRadians = Math.atan2(e.clientY - centerY, e.clientX - centerX); 
    const elAngleDegrees = ((elAngleRadians * 180) / Math.PI + "");

    setElRotation(elAngleDegrees);
  }

  useEffect(() => {
    if (screenWidth >= LARGE_BREAK_POINT) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [screenWidth]);

  const activateRegularSeason = () => {
    dispatch(appStateActions.activateRegularSeason())
  }

  return (
    <button 
      onClick={activateRegularSeason}
      disabled={isLoading}
      className={`relative rounded-full transition-transform ease-out hover:scale-110`}
    >
      <div className={`absolute inset-0 w-full h-full z-10 flex justify-center items-center rounded-full ${isLoading && "bg-gray-300"} opacity-50`}>

      </div>
      <div className={`absolute inset-0 w-full h-full z-10 flex justify-center items-center rounded-full`}>
        <h2 className="text-7xl">
          {isLoading ? "Loading..." : "Start"}
        </h2>
      </div>
      <div 
        className={`${isLoading && 'motion-safe:animate-spin'}`}
        style={{ transform: !isLoading && `rotate(${elRotation}deg)`}}
      >
        <BasketballSVG size={screenWidth >= SMALL_BREAK_POINT ? "400" : "300"} 
          basketballColor={BASKETBALL_COLOR} 
          seamColor={BASKETBALL_SEAM_COLOR} 
        />
      </div>
    </button>);
}

export default StartButton;