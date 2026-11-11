import type { Page } from "@playwright/test";

/** Nothing listens here, so server-side Supabase calls (middleware) fail fast. */
export const FAKE_SUPABASE_URL = "http://127.0.0.1:54399";
export const FAKE_ANON_KEY = "e2e-anon-key";
/** localStorage key under which the app keeps a logged-out player's anonymous id. */
export const ANON_USER_ID_STORAGE_KEY = "e2e_anon_user_id";

export type FakeUser = { id: string; email: string };

/**
 * Answers the browser's Supabase auth calls. Logged out, nothing errors.
 * Login is added in a later task, so the user is unused for now.
 */
export async function installFakeAuth(
  page: Page,
  user: FakeUser | null = null,
): Promise<void> {
  void user;
  await page.route(`${FAKE_SUPABASE_URL}/auth/v1/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    }),
  );
}
