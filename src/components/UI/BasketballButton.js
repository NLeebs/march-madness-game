"use client"
// Libraries
import React from "react";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// Images



// Component Function
function BasketballButton() {
  

  return (
    <button 
      onClick={activateRegularSeason}
      disabled={isLoading}
      className={`${isLoading && "bg-gray-200"}`}
    >
      {isLoading ? "Loading..." : "Start!"}
    </button>);
}

export default BasketballButton;