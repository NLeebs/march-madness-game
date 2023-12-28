"use client"
// Libraries
import React, { Fragment } from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
// React Functions
import { useSelector } from "react-redux";
// Constants
import { ACCENT_COLOR } from "@/constants/CONSTANTS";


// Component Function
function Dialog(props) {
    // Return if not open
    if (!props.isOpen) return null;


  return ReactDOM.createPortal(
    <Fragment>
        <motion.div 
            className="fixed h-max transform inset-x-8 md:left-1/2 md:-translate-x-1/2 top-1/2 -translate-y-1/2 z-50 p-8 flex flex-col justify-around items-center gap-4 border-solid border-2 rounded-lg"
            initial={{
                opacity: 0,
            }}
            animate={{
                opacity: 1,
            }}
            style={{
                backgroundColor: props.backgroundColor,
                borderColor: ACCENT_COLOR,
            }}
        >
            <div className="w-full flex flex-row-reverse">
                <button onClick={props.onClose}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill={ACCENT_COLOR} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="flex flex-col justify-start items-center gap-8">
                {props.children}
            </div>
        </motion.div>
        <motion.div 
            initial={{
                opacity: 0,
            }}
            animate={{
                opacity: .5,
            }}
            onClick={props.onClose} 
            className="fixed inset-0 z-10"
            style={{backgroundColor: ACCENT_COLOR,}}
        >
        </motion.div>
    </Fragment>,
    document.getElementById("modal-root")
  );
};

export default Dialog;