import { defineConfig } from "@playwright/test";
import { FAKE_ANON_KEY, FAKE_SUPABASE_URL } from "./e2e/support/fakeAuth";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  retries: 0,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    trace: "retain-on-failure",
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: FAKE_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: FAKE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: "e2e-unused",
      NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${PORT}`,
      NEXT_PUBLIC_E2E: "1",
      NEXT_PUBLIC_APP_MODE: "",
    },
  },
  projects: [
    {
      name: "laptop",
      grepInvert: /@wide/,
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
});
