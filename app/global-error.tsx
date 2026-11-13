"use client";
import "./globals.css";
import React, { useEffect } from "react";
import { CrashScreen } from "@/src/components/General";
import { readAnonUserId, reportCrash } from "@/src/utils/crashReporting";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Last-resort crash screen when the root layout itself fails. Replaces the whole document. */
export default function GlobalError({ error }: GlobalErrorProps): JSX.Element {
  useEffect(() => {
    reportCrash(error, {
      boundary: "global",
      anonUserId: readAnonUserId(),
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <CrashScreen buttonText="Back to home" />
      </body>
    </html>
  );
}
