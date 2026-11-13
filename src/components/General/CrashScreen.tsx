"use client";
import React from "react";
// Direct import, not the components barrel: the crash screen must load even when the
// rest of the app (e.g. the Supabase client) cannot.
import { Button } from "@/src/components/UI/Button";
import { PRIMARY_COLOR } from "@/src/constants";

interface CrashScreenProps {
  buttonText: string;
}

/** Shown in place of a crashed page. The button does a full page load of the home page. */
export const CrashScreen: React.FC<CrashScreenProps> = ({ buttonText }) => (
  <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-blue-300 from-50% to-blue-50 to-80% px-4 text-center">
    <h1 className="text-3xl font-bold text-neutral-900">Something went wrong</h1>
    <p className="max-w-md text-lg text-neutral-800">
      Sorry about that. We&apos;ve been notified and will look into it.
    </p>
    <Button
      text={buttonText}
      backgroundColor={PRIMARY_COLOR}
      onClick={() => window.location.assign("/")}
    />
  </main>
);
