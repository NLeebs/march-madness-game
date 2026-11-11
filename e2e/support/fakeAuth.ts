import { expect, type Page } from "@playwright/test";
import { MIN_FORM_FILL_TIME } from "@/src/constants/CONSTANTS";

/** Nothing listens here, so server-side Supabase calls (middleware) fail fast. */
export const FAKE_SUPABASE_URL = "http://127.0.0.1:54399";
export const FAKE_ANON_KEY = "e2e-anon-key";
/** localStorage key under which the app keeps a logged-out player's anonymous id. */
export const ANON_USER_ID_STORAGE_KEY = "e2e_anon_user_id";

export type FakeUser = { id: string; email: string };

export const FAKE_USER: FakeUser = {
  id: "00000000-0000-4000-8000-0000000000e2",
  email: "player@e2e.test",
};
export const FAKE_PASSWORD = "correct-horse";

const HOUR_SECONDS = 3600;

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** An unsigned JWT: the client only decodes it (sub, exp), it never verifies the signature. */
function fakeAccessToken(user: FakeUser, expiresAt: number): string {
  const payload = {
    sub: user.id,
    email: user.email,
    role: "authenticated",
    aud: "authenticated",
    exp: expiresAt,
  };
  return `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url(payload)}.`;
}

function sessionBody(user: FakeUser) {
  const expiresAt = Math.floor(Date.now() / 1000) + HOUR_SECONDS;
  return {
    access_token: fakeAccessToken(user, expiresAt),
    refresh_token: "e2e-refresh-token",
    expires_in: HOUR_SECONDS,
    expires_at: expiresAt,
    token_type: "bearer",
    user: {
      id: user.id,
      email: user.email,
      aud: "authenticated",
      role: "authenticated",
      app_metadata: {},
      user_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    },
  };
}

/**
 * Answers the browser's Supabase auth calls. Logged out, nothing errors.
 * Password login succeeds only for FAKE_USER / FAKE_PASSWORD.
 */
export async function installFakeAuth(page: Page): Promise<void> {
  await page.route(`${FAKE_SUPABASE_URL}/auth/v1/**`, (route) => {
    const request = route.request();
    const { pathname, searchParams } = new URL(request.url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (
      request.method() === "POST" &&
      pathname === "/auth/v1/token" &&
      searchParams.get("grant_type") === "password"
    ) {
      const creds = request.postDataJSON() as { email?: string; password?: string };
      if (creds.email === FAKE_USER.email && creds.password === FAKE_PASSWORD) {
        return json(sessionBody(FAKE_USER));
      }
      return json(
        { error: "invalid_grant", error_description: "Invalid login credentials" },
        400,
      );
    }
    if (request.method() === "GET" && pathname === "/auth/v1/user") {
      return json(FAKE_USER);
    }
    if (request.method() === "POST" && pathname === "/auth/v1/logout") {
      return route.fulfill({ status: 204 });
    }
    return json({});
  });
}

/**
 * Opens the Login dialog from the nav bar, fills it in and submits. ProtectedForm starts its
 * fill timer when it mounts (with the dialog) and rejects a submit made within MIN_FORM_FILL_TIME
 * of that. The form exposes no state to poll (the submit button is enabled throughout), so the
 * wait is an elapsed-time poll anchored to the dialog appearing, not a sleep and not added on
 * top of the time the fills take.
 */
export async function signInThroughUi(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.getByRole("button", { name: "Login", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Login" });
  await expect(dialog).toBeVisible();
  const shownAt = Date.now();
  // The app's labels carry htmlFor but the inputs have no id, so getByLabel cannot find them.
  await dialog.locator('input[name="email"]').fill(email);
  await dialog.locator('input[name="password"]').fill(password);

  const submit = dialog.getByRole("button", { name: "Login", exact: true });
  await expect
    .poll(() => Date.now() - shownAt, { message: "form fill time reached" })
    .toBeGreaterThanOrEqual(MIN_FORM_FILL_TIME);
  await expect(submit).toBeEnabled();
  await submit.click();
}
