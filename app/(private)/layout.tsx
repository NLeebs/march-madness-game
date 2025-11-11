"use client";
import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/hooks";

const PrivateLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!authLoading && !user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/");
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default PrivateLayout;
