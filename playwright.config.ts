import { defineConfig } from "@playwright/test";
import { E2E_ENV, E2E_PORT } from "./e2e/support/env";

const PORT = E2E_PORT;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  retries: 0,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    trace: "retain-on-failure",
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  webServer: {
    // CI builds in a separate workflow step (`npm run e2e:build`); locally the build runs here.
    command: process.env.CI
      ? `npx next start -p ${PORT}`
      : `npm run e2e:build && npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: process.env.CI ? 120_000 : 300_000,
    reuseExistingServer: !process.env.CI,
    env: E2E_ENV,
  },
  projects: [
    {
      name: "phone",
      grep: /@every-size|@mobile-too/,
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: "tablet",
      grep: /@every-size/,
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: "laptop",
      grepInvert: /@wide/,
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: "wide",
      grep: /@wide/,
      use: { viewport: { width: 2560, height: 1440 } },
    },
  ],
});
