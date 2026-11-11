import { ANON_USER_ID_STORAGE_KEY, FAKE_ANON_KEY, FAKE_SUPABASE_URL } from "./fakeAuth";

export const E2E_PORT = 3100;

/**
 * Environment of the app under test. `NEXT_PUBLIC_*` values are inlined at build time, so the
 * build (`scripts/e2e/build.mts`) and the server (`playwright.config.ts` webServer) both use this.
 */
export const E2E_ENV: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: FAKE_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: FAKE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: "e2e-unused",
  NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${E2E_PORT}`,
  NEXT_PUBLIC_E2E: "1",
  NEXT_PUBLIC_BROWSER_ANON_KEY: ANON_USER_ID_STORAGE_KEY,
  NEXT_PUBLIC_APP_MODE: "",
};
