import type { Page } from "@playwright/test";
import { test, expect } from "./support/test";

const startButton = (page: Page) =>
  page.getByRole("button", { name: "Start the game" });

test("starts the latest year and reaches the regular season", async ({ page, backend }) => {
  await page.goto("/");
  await startButton(page).click();
  await expect(page.getByTestId("regular-season")).toBeVisible({ timeout: 10_000 });
  expect(backend.requestedPaths).toContain("/api/team-statistics/e2e-year-latest");
});

test.describe("slow team stats", () => {
  test.use({ backendOptions: { teamStatsDelayMs: 2000 } });

  test("start waits for slow team stats", async ({ page }) => {
    await page.goto("/");
    await expect(startButton(page)).toBeDisabled();
    await expect(page.getByTestId("regular-season")).toHaveCount(0);
    await expect(startButton(page)).toBeEnabled({ timeout: 10_000 });
    await startButton(page).click();
    await expect(page.getByTestId("regular-season")).toBeVisible({ timeout: 10_000 });
  });
});

test("choosing the older year plays that year's league", async ({ page, backend }) => {
  await page.goto("/");
  await expect(startButton(page)).toBeEnabled();
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "2024" }).click();
  await expect(startButton(page)).toBeEnabled();
  await startButton(page).click();
  await expect(page.getByTestId("regular-season")).toBeVisible({ timeout: 10_000 });
  expect(backend.requestedPaths).toContain("/api/team-statistics/e2e-year-older");
  // conf01 is dropped from the older year; team001 belongs to it.
  await expect(page.getByText("team001", { exact: true })).toHaveCount(0);
  await expect(page.getByText("team360", { exact: true })).not.toHaveCount(0);
});

test("middleware does not hang on the fake Supabase URL", async ({ page }) => {
  const started = Date.now();
  await page.goto("/");
  expect(Date.now() - started).toBeLessThan(3_000);
});
