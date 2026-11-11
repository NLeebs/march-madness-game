import type { Locator, Page } from "@playwright/test";
import type { TournamentRound } from "@/types";
import { expect } from "@playwright/test";
import { mulberry32 } from "../../tests/game/helpers/mulberry32";
import { checkPickLandsInNextSlot, showRound, teamButton } from "../checks/picks";
import { BRACKET_ROUNDS, PLAYIN_PLACEHOLDERS, REGION_ORDER } from "./bracketMap";
import { assertNoHorizontalScroll, assertNoOverlap, assertUsable, enforceLayout } from "./layout";
import { PHASE_TIMEOUTS, PICK_ACTION_TIMEOUT_MS } from "./timeouts";

export { PHASE_TIMEOUTS };

export type RecordedPick = {
  round: TournamentRound;
  region: string;
  slot: number;
  team: string;
};

export class GamePage {
  constructor(private readonly page: Page) {}

  private get startButton(): Locator {
    return this.page.getByRole("button", { name: "Start the game" });
  }

  private get recapDialog(): Locator {
    return this.page.getByRole("dialog", { name: "Tournament recap" });
  }

  private get submitButton(): Locator {
    return this.page.getByRole("button", { name: "Submit Picks" });
  }

  /** No sideways page scroll in the phase just reached (known issues are pinned in layout.ts). */
  private async checkScroll(phase: string): Promise<void> {
    await enforceLayout(phase, "horizontal-scroll", () => assertNoHorizontalScroll(this.page));
  }

  /** No two visible team buttons overlap in the phase just reached. */
  async checkNoOverlap(phase: string): Promise<void> {
    await enforceLayout(phase, "overlap", () => assertNoOverlap(this.page, "button.team-selection"));
  }

  async open(): Promise<void> {
    await this.page.goto("/");
    await expect(this.startButton, "phase: start screen did not become ready").toBeEnabled({
      timeout: PHASE_TIMEOUTS.toSeason,
    });
    await this.checkScroll("start screen");
  }

  async start(): Promise<void> {
    await expect(this.startButton, "phase: Start button never became enabled").toBeEnabled({
      timeout: PHASE_TIMEOUTS.toSeason,
    });
    await assertUsable(this.startButton);
    await this.startButton.click({ timeout: PICK_ACTION_TIMEOUT_MS });
    await expect(
      this.page.getByTestId("regular-season"),
      "phase: start -> regular season did not appear in time",
    ).toBeVisible({ timeout: PHASE_TIMEOUTS.toSeason });
    await this.checkScroll("regular season");
  }

  async finishSeason(): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: "Go to Tournament" }),
      "phase: regular season did not finish in time",
    ).toBeVisible({ timeout: PHASE_TIMEOUTS.season });
    await this.checkScroll("selection sunday");
  }

  async goToTournament(): Promise<void> {
    // The button bounces forever (motion-safe:animate-bounce), so Playwright's "stable" check
    // never passes. Check by hand that a user could click it, then dispatch the click event.
    const button = this.page.getByRole("button", { name: "Go to Tournament" });
    await assertUsable(button, { animated: true });
    await button.dispatchEvent("click", undefined, { timeout: PICK_ACTION_TIMEOUT_MS });
    await expect(
      this.page.getByTestId("bracket-column-1").first(),
      "phase: selection (round-1 bracket) did not appear in time",
    ).toBeVisible({ timeout: PHASE_TIMEOUTS.toSelection });
    await this.checkScroll("bracket picks");
  }

  /**
   * Picks every game round by round through the UI. A seeded RNG chooses each winner; one
   * play-in placeholder (e.g. playinGameSeed11Game1) is always picked to win its round-1 game.
   * After every click the winner must show in the right slot of the next round.
   * `beforeRound` runs before the games of that round are picked (used for the cascade check).
   */
  async makePicks(
    seed: number,
    hooks: { beforeRound?: (round: TournamentRound) => Promise<void> } = {},
  ): Promise<RecordedPick[]> {
    const startedAt = Date.now();
    const checkBudget = () => {
      if (Date.now() - startedAt > PHASE_TIMEOUTS.picks) {
        throw new Error(`phase: picks did not finish within ${PHASE_TIMEOUTS.picks} ms`);
      }
    };
    const rng = mulberry32(seed);
    const picks: RecordedPick[] = [];
    for (const round of BRACKET_ROUNDS) {
      await hooks.beforeRound?.(round.round);
      await showRound(this.page, round.round);
      const buttons = this.page.locator(`button.team-selection[data-round="${String(round.round)}"]`);
      await expect(
        buttons,
        `phase: picks: ${String(round.round)} has the wrong number of team buttons`,
      ).toHaveCount(round.games * 2, { timeout: PICK_ACTION_TIMEOUT_MS });
      const cells = await buttons.evaluateAll((els) =>
        els.map((el) => ({
          region: (el as HTMLElement).dataset.region ?? "",
          matchup: Number((el as HTMLElement).dataset.matchup),
          side: Number((el as HTMLElement).dataset.value),
          team: (el as HTMLElement).dataset.team ?? "",
        })),
      );
      const games = new Map<string, { region: string; matchup: number; teams: string[] }>();
      for (const cell of cells) {
        const key = `${cell.region}/${cell.matchup}`;
        const game = games.get(key) ?? { region: cell.region, matchup: cell.matchup, teams: ["", ""] };
        game.teams[cell.side] = cell.team;
        games.set(key, game);
      }
      const ordered = Array.from(games.values()).sort(
        (x, y) => REGION_ORDER.indexOf(x.region) - REGION_ORDER.indexOf(y.region) || x.matchup - y.matchup,
      );
      expect(ordered, `phase: picks: ${String(round.round)} games`).toHaveLength(round.games);

      let forced = -1;
      if (round.round === 1) {
        const withPlayin = ordered
          .map((game, i) => ({ game, i }))
          .filter(({ game }) => game.teams.some((t) => PLAYIN_PLACEHOLDERS.includes(t)));
        if (withPlayin.length === 0) throw new Error("phase: picks: no play-in placeholder in round 1");
        forced = withPlayin[Math.floor(rng() * withPlayin.length)].i;
      }

      for (const [i, game] of Array.from(ordered.entries())) {
        checkBudget();
        if (game.teams.some((t) => t === "")) {
          throw new Error(`phase: picks: ${String(round.round)} ${game.region} #${game.matchup} has an empty slot`);
        }
        const side =
          i === forced
            ? game.teams.findIndex((t) => PLAYIN_PLACEHOLDERS.includes(t))
            : rng() < 0.5
              ? 0
              : 1;
        const team = game.teams[side];
        const button = teamButton(this.page, {
          round: round.round,
          region: game.region,
          matchup: game.matchup,
          side,
        });
        await assertUsable(button);
        await button.click({ timeout: PICK_ACTION_TIMEOUT_MS });
        const pick: RecordedPick = { round: round.round, region: game.region, slot: game.matchup, team };
        await checkPickLandsInNextSlot(this.page, pick);
        picks.push(pick);
      }
    }
    expect(
      picks.some((p) => p.round === 1 && PLAYIN_PLACEHOLDERS.includes(p.team)),
      "phase: picks: no play-in placeholder was picked to win round 1",
    ).toBe(true);
    await expect(
      this.submitButton,
      "phase: picks: bracket not complete after making every pick",
    ).toBeVisible({ timeout: PICK_ACTION_TIMEOUT_MS });
    await this.checkScroll("bracket complete");
    return picks;
  }

  /** Click Submit Picks, which starts the play-in games and then the rest of the tournament. */
  async submitPicks(): Promise<void> {
    await assertUsable(this.submitButton);
    await this.submitButton.click({ timeout: PICK_ACTION_TIMEOUT_MS });
  }

  async playTournament(): Promise<void> {
    await this.submitPicks();
    await expect(
      this.page.getByRole("button", { name: "See Recap" }),
      "phase: tournament did not finish in time",
    ).toBeVisible({ timeout: PHASE_TIMEOUTS.tournament });
    await this.checkScroll("tournament finished");
  }

  /**
   * The recap dialog opens by itself when the tournament ends and covers the See Recap button.
   * If it was closed, "See Recap" reopens it.
   */
  async openRecap(): Promise<Locator> {
    if (!(await this.recapDialog.isVisible())) {
      const seeRecap = this.page.getByRole("button", { name: "See Recap" });
      await assertUsable(seeRecap);
      await seeRecap.click({ timeout: PICK_ACTION_TIMEOUT_MS });
    }
    await expect(this.recapDialog, "phase: recap dialog did not open").toBeVisible();
    return this.recapDialog;
  }

  async restart(): Promise<void> {
    const playAgain = this.recapDialog.getByRole("button", { name: "Play Again" });
    await assertUsable(playAgain);
    await playAgain.click({ timeout: PICK_ACTION_TIMEOUT_MS });
    await expect(
      this.startButton,
      "phase: start screen did not come back after Play Again",
    ).toBeVisible({ timeout: PHASE_TIMEOUTS.toStart });
    await this.checkScroll("start screen after restart");
  }
}
