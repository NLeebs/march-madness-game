import type { BrowserOptions } from "@sentry/nextjs";

type SentryInitOptions = Pick<BrowserOptions, "dsn" | "environment" | "dataCollection">;

/**
 * Sentry.init options shared by the browser, Node and edge runtimes, or undefined
 * when there is no DSN (dev, CI, e2e), which leaves Sentry off. Errors only: no
 * tracing (tracesSampleRate unset) and no personal or request data.
 */
export function sentryInitOptions(
  dsn: string | undefined,
  environment: string | undefined
): SentryInitOptions | undefined {
  if (!dsn) return undefined;
  return {
    dsn,
    environment,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    },
  };
}
