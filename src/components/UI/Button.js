"use client"
// Libraries
import React from "react";


// Component Function
function Button(props) {
  

  return (
    <button
      type="button"
      className="rounded-full px-6 py-4 text-lg font-semibold text-neutral-50 shadow-sm transition-transform ease-out hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-300"
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