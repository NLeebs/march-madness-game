import type { Page } from "@playwright/test";
import { test, expect } from "./support/test";
import { DASHBOARD_USERNAME } from "./fixtures/dashboard";
import { FAKE_PASSWORD, FAKE_USER, signInThroughUi } from "./support/fakeAuth";
import { GAME_BUDGET_MS } from "./support/timeouts";
import { checkPersistPayload } from "./checks/results";
import { assertNoHorizontalScroll, assertUsable } from "./support/layout";

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

test.describe("small phones", () => {
  // The phone project is 390px wide; real phones go down to 360px (finding 48). The tag routes
  // these to phone (mobile, touch) as well as laptop, and the viewport below overrides both to
  // the same width, so they run on phone only.
  for (const width of [360, 375]) {
    test.describe(`${width}px`, () => {
      test.use({ viewport: { width, height: 740 } });

      test(`signed-in nav fits at ${width}px @mobile-too`, async ({ page, game }) => {
        test.skip(test.info().project.name !== "phone", "phone emulation only; laptop would repeat it");
        await game.open();
        await signInThroughUi(page, FAKE_USER.email, FAKE_PASSWORD);
        await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
        await assertNoHorizontalScroll(page);
        await assertUsable(page.getByRole("button", { name: "Dashboard" }));
        await assertUsable(page.getByRole("button", { name: "Logout" }));
      });
    });
  }
});

test.describe("with dashboard data", () => {
  test.use({ backendOptions: { dashboard: true } });

  test("logout returns to logged out", async ({ page, game }) => {
    await game.open();
    await signInThroughUi(page, FAKE_USER.email, FAKE_PASSWORD);
    // Wait for the sign-in to land: navigating while it is in flight cancels the request
    // ("Failed to fetch") and /dashboard then loads signed out.
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

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
  test.setTimeout(2 * GAME_BUDGET_MS + 60_000);
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
    await checkPersistPayload(backend, picks, true, page);
    backend.persistRequests.length = 0;
    if (seed === 1) await game.restart();
  }
});
