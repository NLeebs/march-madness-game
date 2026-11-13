"use client";
import React, { useContext, useEffect } from "react";
import { AuthContext } from "@/src/components/Context/AuthProvider";
// Direct import, not the barrel: this page must load even when the rest of the app cannot.
import { CrashScreen } from "@/src/components/General/CrashScreen";
import { readAnonUserId, reportCrash } from "@/src/utils/crashReporting";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Crash screen for any route segment below the root layout. */
export default function RouteError({ error }: ErrorPageProps): JSX.Element {
  // Not useAuth(): it throws when the context is missing, and this page must not.
  const auth = useContext(AuthContext) as { user?: { id?: string } | null } | null;
  const userId = auth?.user?.id;

  useEffect(() => {
    reportCrash(error, {
      boundary: "route",
      userId,
      anonUserId: readAnonUserId(),
      digest: error.digest,
    });
    // Report once per error, not when auth state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return <CrashScreen buttonText="Back to home" />;
}
