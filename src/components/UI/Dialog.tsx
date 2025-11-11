"use client";
// Libraries
import React from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { ACCENT_COLOR } from "@/src/constants";

interface DialogProps {
  isOpen: boolean;
  hasCloseButton?: boolean;
  onClose: () => void;
  dialogBackgroundColor?: string;
  dialogBorderColor?: string;
  overlayOpacity?: number;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  hasCloseButton = true,
  onClose,
  dialogBackgroundColor = "#FFF",
  dialogBorderColor = ACCENT_COLOR,
  overlayOpacity = 0.5,
  children,
}) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <motion.div
        className="fixed h-max transform inset-x-8 md:left-1/2 md:-translate-x-1/2 top-1/2 -translate-y-1/2 z-50 p-8 flex flex-col justify-around items-center gap-4 border-solid border-2 rounded-lg"
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        style={{
          backgroundColor: dialogBackgroundColor,
          borderColor: dialogBorderColor,
        }}
      >
        {hasCloseButton && (
          <div className="w-full flex flex-row-reverse">
            <button onClick={onClose}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill={ACCENT_COLOR}
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        <div className="flex flex-col justify-start items-center gap-8">
          {children}
        </div>
      </motion.div>
      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: overlayOpacity,
        }}
        onClick={onClose}
        className="fixed inset-0 z-10"
        style={{ backgroundColor: ACCENT_COLOR }}
      ></motion.div>
    </>,
    document.getElementById("modal-root")
  );
};
