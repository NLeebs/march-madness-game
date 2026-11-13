import * as Sentry from "@sentry/nextjs";
import { sentryInitOptions } from "@/src/utils/crashReporting/sentryInitOptions";

// Off unless NEXT_PUBLIC_SENTRY_DSN is set (only in Vercel), so dev, CI and e2e send nothing.
const options = sentryInitOptions(
  process.env.NEXT_PUBLIC_SENTRY_DSN,
  process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV
);
if (options) Sentry.init(options);
