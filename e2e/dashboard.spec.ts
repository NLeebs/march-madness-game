import type { Page } from "@playwright/test";
import { test, expect } from "./support/test";
import { FAKE_PASSWORD, FAKE_USER, signInThroughUi } from "./support/fakeAuth";
import { assertNoHorizontalScroll, enforceLayout } from "./support/layout";
import {
  DASHBOARD_USERNAME,
  DASHBOARD_YEAR_VALUES,
  PREP_LISTS,
  championName,
  conferenceName,
  prepTeamName,
  userPickName,
  type DashboardYearId,
} from "./fixtures/dashboard";

const LATEST: DashboardYearId = "e2e-year-latest";
const OLDER: DashboardYearId = "e2e-year-older";

test.use({ backendOptions: { dashboard: true } });

/** The StatList / StatBubble card around a heading or label. */
const card = (page: Page, title: string) =>
  page.getByText(title, { exact: true }).locator("..");

async function expectYourStats(page: Page, yearId: DashboardYearId, otherYearId: DashboardYearId) {
  const { stats, scores } = DASHBOARD_YEAR_VALUES[yearId];

  await expect(page.getByRole("heading", { name: "Your Bracket Scores" })).toBeVisible();
  // One chart point per saved bracket: 3 for 2025, 2 for 2024.
  await expect(page.locator(".recharts-line-dots circle")).toHaveCount(scores.length);

  const bubbles: [string, number][] = [
    ["High Score", stats.high_score],
    ["Low Score", stats.low_score],
    ["Average Score", stats.average_score],
    ["Number of Brackets", stats.total_brackets],
    ["Total Picks", stats.total_picks],
    ["Correct Picks", stats.total_correct_picks],
  ];
  for (const [label, value] of bubbles) {
    await expect(card(page, label), label).toContainText(String(value));
  }

  for (const index of [1, 2, 3]) {
    await expect(card(page, "Top Picked Teams")).toContainText(userPickName(yearId, index));
  }
  await expect(card(page, "Top Picked Champion")).toContainText(championName(yearId));
  await expect(card(page, "Top Picked Conference")).toContainText(conferenceName(yearId));
  await expect(page.getByText(championName(otherYearId), { exact: true })).toHaveCount(0);
}

async function expectPrepLists(page: Page, yearId: DashboardYearId, otherYearId: DashboardYearId) {
  for (const list of PREP_LISTS.filter((l) => l.title)) {
    await expect(card(page, list.title), list.title).toContainText(prepTeamName(yearId, list, 1));
    await expect(card(page, list.title), list.title).toContainText(prepTeamName(yearId, list, 2));
    await expect(page.getByText(prepTeamName(otherYearId, list, 1), { exact: true })).toHaveCount(0);
  }
  await expect(card(page, "Upsets By Seeds")).toContainText(
    `${DASHBOARD_YEAR_VALUES[yearId].seedUpsetPercentage}%`,
  );
  await expect(card(page, "Upsets By Seeds")).not.toContainText(
    `${DASHBOARD_YEAR_VALUES[otherYearId].seedUpsetPercentage}%`,
  );
}

test("signed-in dashboard shows both tabs and follows the year select @mobile-too", async ({
  page,
  game,
  backend,
}) => {
  await game.open();
  await signInThroughUi(page, FAKE_USER.email, FAKE_PASSWORD);
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText(`Welcome ${DASHBOARD_USERNAME}`)).toBeVisible();

  // Latest year (2025) is selected by default.
  const yearSelect = page.getByText("Select a year").locator("..").getByRole("combobox");
  await expect(yearSelect).toHaveText("2025");

  await expectYourStats(page, LATEST, OLDER);
  await enforceLayout(page, "dashboard", "horizontal-scroll", () => assertNoHorizontalScroll(page));

  await page.getByRole("tab", { name: "Madness Prep" }).click();
  await expectPrepLists(page, LATEST, OLDER);
  await enforceLayout(page, "dashboard", "horizontal-scroll", () => assertNoHorizontalScroll(page));

  // Switch to 2024 while "Your Stats" is open (it stays mounted), then check the other tab too.
  await page.getByRole("tab", { name: "Your Stats" }).click();
  await expectYourStats(page, LATEST, OLDER);
  await yearSelect.click();
  await page.getByRole("option", { name: "2024" }).click();
  await expect(yearSelect).toHaveText("2024");
  await expectYourStats(page, OLDER, LATEST);
  await enforceLayout(page, "dashboard", "horizontal-scroll", () => assertNoHorizontalScroll(page));

  await page.getByRole("tab", { name: "Madness Prep" }).click();
  await expectPrepLists(page, OLDER, LATEST);
  await enforceLayout(page, "dashboard", "horizontal-scroll", () => assertNoHorizontalScroll(page));

  const requested = (path: string) => expect(backend.requestedPaths).toContain(path);
  requested(`/api/user-statistics/${FAKE_USER.id}/e2e-year-older`);
  requested(`/api/brackets/${FAKE_USER.id}/e2e-year-older`);
  requested(`/api/pick-count/${FAKE_USER.id}/e2e-year-older`);
  requested("/api/teams/top-performers/e2e-year-older");
  requested("/api/seeds/first-round/upset-percentage/e2e-year-older");
});
