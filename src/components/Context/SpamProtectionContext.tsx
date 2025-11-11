"use client";
import { createContext, useContext } from "react";

interface SpamProtectionContextValue {
  isSubmitting: boolean;
  isRateLimited: boolean;
  submitError: string;
}

const SpamProtectionContext = createContext<
  SpamProtectionContextValue | undefined
>(undefined);

export const useSpamProtectionContext = () => {
  const context = useContext(SpamProtectionContext);
  if (!context) {
    throw new Error(
      "useSpamProtectionContext must be used within a ProtectedForm"
    );
  }
  return context;
};

export { SpamProtectionContext };
