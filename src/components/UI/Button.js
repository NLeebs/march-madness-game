"use client"
// Libraries
import React from "react";
// React Functions
import { useDispatch, useSelector } from "react-redux";
// Images



// Component Function
function Button(props) {
  

  return (
    <button
      type="button"
      className="rounded-full px-4 py-2.5 text-sm font-semibold text-neutral-50 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
      onClick={props.onClick}
      style={{
        backgroundColor: props.backgroundColor,
      }}
    >
      {props.text}
    </button>
    );
}

export default Button;