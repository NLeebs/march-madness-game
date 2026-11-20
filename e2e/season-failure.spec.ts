import { test, expect } from "./support/test";

test.use({ backendOptions: { seasonStatus: 500 } });

test("a failed season request shows the crash screen and Start a new game goes home", async ({
  page,
  game,
  backend,
  errors,
}) => {
  // The browser logs the failed request itself as a console error, without its URL. So the
  // allowance is narrowed by checking below that the only failed response is the season.
  const failedResponses: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failedResponses.push(new URL(r.url()).pathname);
  });
  errors.allow(/Failed to load resource.*500/, "failed season request shows crash screen");
  // React logs the error the boundary caught.
  errors.allow(/e2e simulated failure|Failed to play season/, "failed season request shows crash screen");

  await game.open();
  // Not game.start(): it waits for the regular season, which never appears.
  await page.getByRole("button", { name: "Start the game" }).click();

  const crashHeading = page.getByRole("heading", { name: "Something went wrong" });
  await expect(crashHeading).toBeVisible();
  await expect(page.getByText("Turnover! A crash report is already on the coach's desk.")).toBeVisible();
  expect(backend.seasonRequests, "the season was requested once").toHaveLength(1);
  await expect
    .poll(() => failedResponses, { message: "the only failed response is the season request" })
    .toEqual(["/api/season"]);

  const restart = page.getByRole("button", { name: "Start a new game" });
  await expect(restart).toBeVisible();
  await restart.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(crashHeading).toHaveCount(0);
  await game.open();
});
