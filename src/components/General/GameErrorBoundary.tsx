"use client";
import React from "react";
import { useStore } from "react-redux";
import { useAuth } from "@/src/hooks";
import type { RootState } from "@/store/store";
import {
  reportCrash,
  readAnonUserId,
  summarizeGameState,
  type CrashContext,
} from "@/src/utils/crashReporting";
import { CrashScreen } from "./CrashScreen";

interface BoundaryProps {
  getContext: () => CrashContext;
  children: React.ReactNode;
}

interface BoundaryState {
  crashed: boolean;
}

class Boundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { crashed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { crashed: true };
  }

  componentDidCatch(error: unknown): void {
    let context: CrashContext = { boundary: "game" };
    try {
      context = this.props.getContext();
    } catch {
      // Report with what we have; the crash screen must still render.
    }
    reportCrash(error, context);
  }

  render(): React.ReactNode {
    if (this.state.crashed) return <CrashScreen buttonText="Start a new game" />;
    return this.props.children;
  }
}

/** Catches crashes anywhere in the game, shows the crash screen and reports to Sentry. */
export const GameErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useStore<RootState>();
  const { user } = useAuth() as { user: { id?: string } | null };
  const getContext = (): CrashContext => {
    const context: CrashContext = {
      boundary: "game",
      userId: user?.id,
      anonUserId: readAnonUserId(),
    };
    try {
      context.game = summarizeGameState(store.getState());
    } catch {
      // Bad game state may be what crashed; report without the summary.
    }
    return context;
  };
  return <Boundary getContext={getContext}>{children}</Boundary>;
};
