import * as Sentry from "@sentry/nextjs";
import { GameDataError } from "@/src/functions/generic";
import type { GameCrashContext } from "./gameCrashContext";

export type CrashBoundary = "game" | "route" | "global";

export type CrashContext = {
  boundary: CrashBoundary;
  game?: GameCrashContext;
  userId?: string;
  anonUserId?: string;
};

/** Sends one crash to Sentry with its context. Never throws. */
export function reportCrash(error: unknown, context: CrashContext): void {
  try {
    Sentry.withScope((scope) => {
      scope.setTag("boundary", context.boundary);
      if (context.game) scope.setContext("game", context.game);
      if (error instanceof GameDataError) scope.setContext("gameData", error.details);
      if (context.userId) scope.setUser({ id: context.userId });
      else if (context.anonUserId) scope.setTag("anon_user_id", context.anonUserId);
      Sentry.captureException(error);
    });
  } catch {
    // Reporting must never break the crash screen.
  }
}
