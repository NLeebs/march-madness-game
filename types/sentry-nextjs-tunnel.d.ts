// tsconfig uses moduleResolution "node", which ignores package.json "exports", and
// @sentry/nextjs only exposes ./tunnel through "exports". Point TypeScript at its types.
// Runtime resolution (webpack, vitest) uses "exports" and needs nothing here.
declare module "@sentry/nextjs/tunnel" {
  export { POST, createSentryTunnelRoute } from "@sentry/nextjs/build/types/tunnel/index";
}
