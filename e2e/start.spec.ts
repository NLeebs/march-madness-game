import type { Page } from "@playwright/test";
import { test, expect } from "./support/test";
import { readState } from "./support/state";
import { START_TO_SEASON_TIMEOUT_MS } from "./support/timeouts";

const startButton = (page: Page) =>
  page.getByRole("button", { name: "Start the game" });

test("starts the latest year and reaches the regular season", async ({ page, backend }) => {
  await page.goto("/");
  await startButton(page).click();
  await expect(page.getByTestId("regular-season")).toBeVisible({ timeout: START_TO_SEASON_TIMEOUT_MS });
  expect(backend.requestedPaths).toContain("/api/team-statistics/e2e-year-latest");
  expect((await readState(page)).appState.regularSeason).toBe(true);
});

test.describe("slow team stats", () => {
  test.use({ backendOptions: { teamStatsDelayMs: 2000 } });

  test("start waits for slow team stats", async ({ page }) => {
    await page.goto("/");
    await expect(startButton(page)).toBeDisabled();
    await expect(page.getByTestId("regular-season")).toHaveCount(0);
    await expect(startButton(page)).toBeEnabled({ timeout: START_TO_SEASON_TIMEOUT_MS });
    await startButton(page).click();
    await expect(page.getByTestId("regular-season")).toBeVisible({ timeout: START_TO_SEASON_TIMEOUT_MS });
  });
});

test("choosing the older year plays that year's league", async ({ page, backend }) => {
  await page.goto("/");
  await expect(startButton(page)).toBeEnabled();
  const olderStats = page.waitForResponse("**/api/team-statistics/e2e-year-older");
  await page
    .getByText("Select the tournament year")
    .locator("..")
    .getByRole("combobox")
    .click();
  await page.getByRole("option", { name: "2024" }).click();
  await olderStats;
  await expect(startButton(page)).toBeEnabled();
  await startButton(page).click();
  await expect(page.getByTestId("regular-season")).toBeVisible({ timeout: START_TO_SEASON_TIMEOUT_MS });
  expect(backend.requestedPaths).toContain("/api/team-statistics/e2e-year-older");
  // conf01 is dropped from the older year; team001 belongs to it.
  await expect(page.getByText("team001", { exact: true })).toHaveCount(0);
  await expect(page.getByText("team360", { exact: true })).not.toHaveCount(0);
});

test("middleware does not hang on the fake Supabase URL", async ({ page }) => {
  const started = Date.now();
  await page.goto("/", { waitUntil: "commit" });
  // A real hang on the fake URL lasts far longer than 5 s, so the bound is loose on purpose.
  expect(Date.now() - started).toBeLessThan(5_000);
});
