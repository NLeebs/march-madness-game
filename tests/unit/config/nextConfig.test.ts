import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import path from "path";

// Load next.config.js with withSentryConfig stubbed, to read the options it is given.
function loadSentryBuildOptions(): Record<string, unknown> {
  const require = createRequire(import.meta.url);
  const sentryConfigPath = require.resolve("@sentry/nextjs/config");
  const nextConfigPath = path.resolve(process.cwd(), "next.config.js");
  const saved = require.cache[sentryConfigPath];
  let captured: Record<string, unknown> = {};
  require.cache[sentryConfigPath] = {
    exports: {
      withSentryConfig: (config: unknown, options: Record<string, unknown>) => {
        captured = options;
        return config;
      },
    },
  } as NodeJS.Module;
  try {
    delete require.cache[nextConfigPath];
    require(nextConfigPath);
  } finally {
    if (saved) require.cache[sentryConfigPath] = saved;
    else delete require.cache[sentryConfigPath];
    delete require.cache[nextConfigPath];
  }
  return captured;
}

describe("next.config.js Sentry build options", () => {
  it("never sends Sentry's own build telemetry", () => {
    expect(loadSentryBuildOptions().telemetry).toBe(false);
  });
});
