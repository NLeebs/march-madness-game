import type { Locator, Page } from "@playwright/test";
import type { TournamentRound } from "@/types";
import { expect } from "@playwright/test";
import { assertClickable } from "./layout";
import { PHASE_TIMEOUTS, PICK_ACTION_TIMEOUT_MS } from "./timeouts";

export { PHASE_TIMEOUTS };

export type RecordedPick = {
  round: TournamentRound;
  region: string;
  slot: number;
  team: string;
};

type PickRound = {
  round: TournamentRound;
  /** Button name in the round select banner. */
  banner: string;
  testId: string;
  /** Regions in DOM order for the first (top) and second (bottom) copy of the column. */
  regions: [string[], string[]];
  /** Matchups per region. */
  perRegion: number;
};

const HALVES: [string[], string[]] = [
  ["west", "east"],
  ["south", "midwest"],
];

const PICK_ROUNDS: PickRound[] = [
  { round: 1, banner: "Round of 64", testId: "bracket-column-1", regions: HALVES, perRegion: 8 },
  { round: 2, banner: "Round of 32", testId: "bracket-column-2", regions: HALVES, perRegion: 4 },
  {
    round: "sweet sixteen",
    banner: "Sweet Sixteen",
    testId: "bracket-column-sweet-sixteen",
    regions: HALVES,
    perRegion: 2,
  },
  {
    round: "elite eight",
    banner: "Elite Eight",
    testId: "bracket-column-elite-eight",
    regions: HALVES,
    perRegion: 1,
  },
  {
    round: "final four",
    banner: "Final Four",
    testId: "bracket-column-final-four",
    regions: [["eastWest"], ["southMidwest"]],
    perRegion: 1,
  },
  {
    round: "finals",
    banner: "Finals",
    testId: "bracket-column-finals",
    regions: [["championship"], []],
    perRegion: 1,
  },
];

export class GamePage {
  constructor(private readonly page: Page) {}

  private get startButton(): Locator {
    return this.page.getByRole("button", { name: "Start the game" });
  }

  private get banner(): Locator {
    return this.page.getByTestId("round-select-banner");
  }

  private get recapDialog(): Locator {
    return this.page.getByRole("dialog", { name: "Tournament recap" });
  }

  private get submitButton(): Locator {
    return this.page.getByRole("button", { name: "Submit Picks" });
  }

  async open(): Promise<void> {
    await this.page.goto("/");
    await expect(this.startButton, "phase: start screen did not become ready").toBeEnabled({
      timeout: PHASE_TIMEOUTS.toSeason,
    });
  }

  async start(): Promise<void> {
    await expect(this.startButton, "phase: Start button never became enabled").toBeEnabled({
      timeout: PHASE_TIMEOUTS.toSeason,
    });
    await this.startButton.click({ timeout: PICK_ACTION_TIMEOUT_MS });
    await expect(
      this.page.getByTestId("regular-season"),
      "phase: start -> regular season did not appear in time",
    ).toBeVisible({ timeout: PHASE_TIMEOUTS.toSeason });
  }

  async finishSeason(): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: "Go to Tournament" }),
      "phase: regular season did not finish in time",
    ).toBeVisible({ timeout: PHASE_TIMEOUTS.season });
  }

  async goToTournament(): Promise<void> {
    // The button bounces forever (motion-safe:animate-bounce), so Playwright's "stable" check
    // never passes. Check by hand that a user could click it, then dispatch the click event.
    const button = this.page.getByRole("button", { name: "Go to Tournament" });
    await assertClickable(button);
    await button.dispatchEvent("click", undefined, { timeout: PICK_ACTION_TIMEOUT_MS });
    await expect(
      this.page.getByTestId("bracket-column-1").first(),
      "phase: selection (round-1 bracket) did not appear in time",
    ).toBeVisible({ timeout: PHASE_TIMEOUTS.toSelection });
  }

  /** Switch the bracket to `round` when the round banner is showing (narrower than 2350px). */
  private async showRound(round: PickRound): Promise<void> {
    if (await this.banner.isVisible()) {
      await this.banner
        .getByRole("button", { name: round.banner, exact: true })
        .click({ timeout: PICK_ACTION_TIMEOUT_MS });
    }
  }

  /** Chalk: the first team of every matchup, round by round, through the UI. */
  async makePicks(_seed: number): Promise<RecordedPick[]> {
    const startedAt = Date.now();
    const checkBudget = () => {
      if (Date.now() - startedAt > PHASE_TIMEOUTS.picks) {
        throw new Error(`phase: picks did not finish within ${PHASE_TIMEOUTS.picks} ms`);
      }
    };
    const picks: RecordedPick[] = [];
    for (const round of PICK_ROUNDS) {
      await this.showRound(round);
      const columns = this.page.getByTestId(round.testId);
      for (let half = 0; half < 2; half++) {
        const regions = round.regions[half];
        if (regions.length === 0) continue;
        const count = regions.length * round.perRegion;
        const matchups = columns.nth(half).locator(".matchup-container");
        await expect(
          matchups,
          `phase: picks: ${String(round.round)} column has the wrong matchup count`,
        ).toHaveCount(count, { timeout: PICK_ACTION_TIMEOUT_MS });
        for (let i = 0; i < count; i++) {
          const team = matchups.nth(i).locator("button.team-selection").first();
          checkBudget();
          const name = await team.getAttribute("data-team", { timeout: PICK_ACTION_TIMEOUT_MS });
          if (!name) {
            throw new Error(`phase: picks: no team in ${String(round.round)} matchup ${i}`);
          }
          await team.click({ timeout: PICK_ACTION_TIMEOUT_MS });
          picks.push({
            round: round.round,
            region: regions[Math.floor(i / round.perRegion)],
            slot: i % round.perRegion,
            team: name,
          });
        }
      }
    }
    await expect(
      this.submitButton,
      "phase: picks: bracket not complete after making every pick",
    ).toBeVisible({ timeout: PICK_ACTION_TIMEOUT_MS });
    return picks;
  }

  /** Click Submit Picks, which starts the play-in games and then the rest of the tournament. */
  async submitPicks(): Promise<void> {
    await this.submitButton.click({ timeout: PICK_ACTION_TIMEOUT_MS });
  }

  async playTournament(): Promise<void> {
    await this.submitPicks();
    await expect(
      this.page.getByRole("button", { name: "See Recap" }),
      "phase: tournament did not finish in time",
    ).toBeVisible({ timeout: PHASE_TIMEOUTS.tournament });
  }

  /**
   * The recap dialog opens by itself when the tournament ends and covers the See Recap button.
   * If it was closed, "See Recap" reopens it.
   */
  async openRecap(): Promise<Locator> {
    if (!(await this.recapDialog.isVisible())) {
      await this.page.getByRole("button", { name: "See Recap" }).click({ timeout: PICK_ACTION_TIMEOUT_MS });
    }
    await expect(this.recapDialog, "phase: recap dialog did not open").toBeVisible();
    return this.recapDialog;
  }

  async restart(): Promise<void> {
    await this.recapDialog.getByRole("button", { name: "Play Again" }).click({ timeout: PICK_ACTION_TIMEOUT_MS });
    await expect(
      this.startButton,
      "phase: start screen did not come back after Play Again",
    ).toBeVisible({ timeout: PHASE_TIMEOUTS.toStart });
  }
}
