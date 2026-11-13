// withSentryConfig rewrites the tunnelRoute (/monitoring) here. Unlike the default rewrite,
// this handler only forwards envelopes for our own DSN, so the domain can't relay for others.
export { POST } from "@sentry/nextjs/tunnel";
