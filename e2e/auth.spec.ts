import type { Page } from "@playwright/test";
import { test, expect } from "./support/test";
import { DASHBOARD_USERNAME } from "./fixtures/dashboard";
import { FAKE_PASSWORD, FAKE_USER, signInThroughUi } from "./support/fakeAuth";
import { PHASE_TIMEOUTS, PICK_ACTION_TIMEOUT_MS } from "./support/timeouts";
import { checkPersistPayload } from "./checks/results";

const loginButton = (page: Page) =>
  page.getByRole("navigation").getByRole("button", { name: "Login", exact: true });

test("wrong password shows an error and stays logged out", async ({ page, game, errors }) => {
  errors.allow(/Error logging in/, "LoginForm logs the rejected sign-in before rethrowing");
  errors.allow(/Form submission error/, "ProtectedForm logs the rethrown sign-in error");
  errors.allow(
    /Failed to load resource.*400/,
    "the browser logs the faked 400 from the token endpoint",
  );
  await game.open();
  await signInThroughUi(page, FAKE_USER.email, "wrong-password");

  const dialog = page.getByRole("dialog", { name: "Login" });
  await expect(dialog.getByText("Invalid login credentials")).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(loginButton(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Logout" })).toHaveCount(0);
});

test("login shows the signed-in nav", async ({ page, game }) => {
  await game.open();
  await signInThroughUi(page, FAKE_USER.email, FAKE_PASSWORD);

  await expect(page.getByRole("dialog", { name: "Login" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  await expect(loginButton(page)).toHaveCount(0);
});

test.describe("with dashboard data", () => {
  test.use({ backendOptions: { dashboard: true } });

  test("logout returns to logged out", async ({ page, game }) => {
    await game.open();
    await signInThroughUi(page, FAKE_USER.email, FAKE_PASSWORD);

    // Positive control: signed in, /dashboard is reachable and stays put.
    await page.goto("/dashboard");
    await expect(page.getByText(`Welcome ${DASHBOARD_USERNAME}`)).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Logout" }).click();

    await expect(loginButton(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).toHaveCount(0);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(`Welcome ${DASHBOARD_USERNAME}`)).toHaveCount(0);
  });
});

test("signed-in full game saves under the user id", async ({ page, game, backend }) => {
  test.setTimeout(
    2 *
      (Object.values(PHASE_TIMEOUTS).reduce((sum, ms) => sum + ms, 0) +
        70 * PICK_ACTION_TIMEOUT_MS) +
      60_000,
  );
  await game.open();
  await signInThroughUi(page, FAKE_USER.email, FAKE_PASSWORD);
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

  for (const seed of [1, 2]) {
    await game.start();
    await game.finishSeason();
    await game.goToTournament();
    const picks = await game.makePicks(seed);
    await game.playTournament();
    await game.openRecap();
    await checkPersistPayload(backend, picks, FAKE_USER.id, page);
    backend.persistRequests.length = 0;
    if (seed === 1) await game.restart();
  }
});
