import * as Sentry from "@sentry/nextjs";
import { createSupabaseServerClient } from "@/infrastructure/db/supabaseServer";

/**
 * The signed-in user's id, or null when there is no valid session. Never throws.
 *
 * A 4xx from Auth (no session, expired or invalid token) means logged out.
 * Anything else (Auth down, network error) also returns null, so the player's
 * game goes on and the bracket is saved under their anon id, but it is
 * reported: a signed-in player's bracket may be missing from their stats.
 */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      if (!isLoggedOutError(error)) reportAuthFailure(error);
      return null;
    }
    return user?.id ?? null;
  } catch (error) {
    reportAuthFailure(error);
    return null;
  }
}

function isLoggedOutError(error: { status?: number }): boolean {
  return typeof error.status === "number" && error.status >= 400 && error.status < 500;
}

function reportAuthFailure(error: unknown): void {
  try {
    Sentry.captureException(error, { tags: { source: "getSessionUserId" } });
  } catch {
    // Reporting must never break the request.
  }
}
