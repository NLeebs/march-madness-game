const { withSentryConfig } = require("@sentry/nextjs/config");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Always define the flag so an unset value is inlined as "" and the e2e-only
  // store exposure is compiled out of production builds.
  env: { NEXT_PUBLIC_E2E: process.env.NEXT_PUBLIC_E2E ?? "" },
  // Next 14 only runs instrumentation.ts (server-side Sentry init) with this flag.
  experimental: { instrumentationHook: true },
};

// Source maps upload only when SENTRY_AUTH_TOKEN is set (Vercel build env); other builds skip it.
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Send browser reports through our own domain so ad blockers don't drop them.
  tunnelRoute: "/monitoring",
  widenClientFileUpload: true,
  // The build plugin otherwise reports its own usage to Sentry on every build, including CI and e2e.
  telemetry: false,
});
