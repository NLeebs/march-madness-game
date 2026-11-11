import type { Page } from "@playwright/test";
import type { TournamentRound } from "@/types";
import type { RootState } from "@/store/store";
import { test, expect } from "./support/test";
import { readState } from "./support/state";
import { PHASE_TIMEOUTS, PICK_ACTION_TIMEOUT_MS } from "./support/timeouts";
import { BRACKET_ROUNDS } from "./support/bracketMap";
import {
  assertNoHorizontalScroll,
  assertRoundUnclipped,
  assertUsable,
  enforceLayout,
  layoutSignature,
  waitForLayoutToSettle,
  type LayoutSignature,
} from "./support/layout";
import { showRound } from "./checks/picks";
import { checkHighlights, checkScore } from "./checks/results";
import {
  AMOUNT_SEASON_GAMES,
  LARGE_BREAK_POINT,
  MEDIUM_BREAK_POINT,
  SMALL_BREAK_POINT,
  TOURNAMENT_BREAK_POINT,
  XL_LARGE_BREAK_POINT,
  XXL_LARGE_BREAK_POINT,
  XXXL_LARGE_BREAK_POINT,
} from "@/src/constants";

/**
 * Widths the window is resized through: the phone width, then just at, under or over each
 * breakpoint (the app compares with `<=` / `>`, so a breakpoint value itself is on the narrow
 * side). TOURNAMENT_BREAK_POINT itself (2350) is skipped on purpose: at exactly 2350 neither
 * play-in column renders (`< 2350` for one, `> 2350` for the other), a known gap in the app.
 * 2349 and 2351 straddle it instead.
 */
const RESIZE_WIDTHS = [
  390,
  SMALL_BREAK_POINT,
  MEDIUM_BREAK_POINT,
  LARGE_BREAK_POINT - 1,
  LARGE_BREAK_POINT,
  XL_LARGE_BREAK_POINT,
  XXL_LARGE_BREAK_POINT,
  XXXL_LARGE_BREAK_POINT,
  TOURNAMENT_BREAK_POINT - 1,
  TOURNAMENT_BREAK_POINT + 1,
  2400,
];
/** The laptop project's width: each sweep starts and ends here. */
const HOME_WIDTH = 1440;
const HEIGHT = 900;

/** "season" = regular season / Selection Sunday (no bracket on screen); "bracket" = any tournament phase. */
type SignaturePhase = "season" | "bracket";

/** Short column names in the table below; the page's test ids are `bracket-column-<name>`. */
type Column = "playin" | "1" | "2" | "sweet-sixteen" | "elite-eight" | "final-four" | "finals" | "champion";
type Row = { banner: boolean; columns: Column[] };

/**
 * What a FRESH page load shows at each width, per phase and selected round. There is no seam to
 * load a game state into a second page, so this table stands in for "a fresh load at that width".
 *
 * Produced 2026-11-11 by measurement: `E2E_MEASURE_SIGNATURES=1 npx playwright test e2e/resize.spec.ts`
 * (laptop project only) opens a new page at each width (never resized), plays a game there and
 * prints this table's entry for that width: the `layoutSignature` on Selection Sunday and with
 * each selectable round selected. It also checks that the tournament-finished and recap phases show the same signature as picking at the same round (so
 * the "bracket" rows cover all three). Columns of a round that is not selected still count as
 * visible when they have a box (they sit off to the side, clipped by the grid). Wider than
 * TOURNAMENT_BREAK_POINT there is no banner and round 1 is always selected, so only round 1 is
 * listed there. To regenerate, run that command and paste the printed entries here in width order.
 */
const EXPECTED_SIGNATURES: Record<number, { season: Row; bracket: Record<string, Row> }> = {
  390: {
    season: { banner: false, columns: [] },
    bracket: {
      1: { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      2: { banner: true, columns: ["2", "champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "sweet sixteen": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "elite eight": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals"] },
      "final four": { banner: true, columns: ["champion", "final-four", "finals"] },
      finals: { banner: true, columns: ["champion", "finals"] },
    },
  },
  640: {
    season: { banner: false, columns: [] },
    bracket: {
      1: { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      2: { banner: true, columns: ["2", "champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "sweet sixteen": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "elite eight": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals"] },
      "final four": { banner: true, columns: ["champion", "final-four", "finals"] },
      finals: { banner: true, columns: ["champion", "finals"] },
    },
  },
  768: {
    season: { banner: false, columns: [] },
    bracket: {
      1: { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      2: { banner: true, columns: ["2", "champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "sweet sixteen": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "elite eight": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals"] },
      "final four": { banner: true, columns: ["champion", "final-four", "finals"] },
      finals: { banner: true, columns: ["champion", "finals"] },
    },
  },
  1023: {
    season: { banner: false, columns: [] },
    bracket: {
      1: { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      2: { banner: true, columns: ["2", "champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "sweet sixteen": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "elite eight": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals"] },
      "final four": { banner: true, columns: ["champion", "final-four", "finals"] },
      finals: { banner: true, columns: ["champion", "final-four", "finals"] },
    },
  },
  1024: {
    season: { banner: false, columns: [] },
    bracket: {
      1: { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      2: { banner: true, columns: ["2", "champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "sweet sixteen": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "elite eight": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals"] },
      "final four": { banner: true, columns: ["champion", "final-four", "finals"] },
      finals: { banner: true, columns: ["champion", "final-four", "finals"] },
    },
  },
  1400: {
    season: { banner: false, columns: [] },
    bracket: {
      1: { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      2: { banner: true, columns: ["2", "champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "sweet sixteen": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "elite eight": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals"] },
      "final four": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals"] },
      finals: { banner: true, columns: ["champion", "elite-eight", "final-four", "finals"] },
    },
  },
  1440: {
    season: { banner: false, columns: [] },
    bracket: {
      1: { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      2: { banner: true, columns: ["2", "champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "sweet sixteen": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "elite eight": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "final four": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      finals: { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
    },
  },
  1700: {
    season: { banner: false, columns: [] },
    bracket: {
      1: { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      2: { banner: true, columns: ["2", "champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "sweet sixteen": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "elite eight": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "final four": { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      finals: { banner: true, columns: ["champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
    },
  },
  2040: {
    season: { banner: false, columns: [] },
    bracket: {
      1: { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      2: { banner: true, columns: ["2", "champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "sweet sixteen": { banner: true, columns: ["2", "champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "elite eight": { banner: true, columns: ["2", "champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      "final four": { banner: true, columns: ["2", "champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
      finals: { banner: true, columns: ["2", "champion", "elite-eight", "final-four", "finals", "sweet-sixteen"] },
    },
  },
  2349: {
    season: { banner: false, columns: [] },
    bracket: {
      1: { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      2: { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      "sweet sixteen": { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      "elite eight": { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      "final four": { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
      finals: { banner: true, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
    },
  },
  2351: {
    season: { banner: false, columns: [] },
    bracket: {
      1: { banner: false, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
    },
  },
  2400: {
    season: { banner: false, columns: [] },
    bracket: {
      1: { banner: false, columns: ["1", "2", "champion", "elite-eight", "final-four", "finals", "playin", "sweet-sixteen"] },
    },
  },
};

function expectedSignature(width: number, phase: SignaturePhase, selectedRound: TournamentRound): LayoutSignature {
  const atWidth = EXPECTED_SIGNATURES[width];
  if (!atWidth) throw new Error(`no measured signature for width ${width}`);
  const row = phase === "season" ? atWidth.season : atWidth.bracket[String(selectedRound)];
  if (!row) throw new Error(`no measured signature for ${width}px / ${phase} / ${String(selectedRound)}`);
  return {
    bannerVisible: row.banner,
    visibleColumns: row.columns.map((c) => `bracket-column-${c}`).sort(),
  };
}

/** True while the regular season screen is up and its weeks have not all been played. */
function seasonPlaying(state: RootState): boolean {
  return (
    state.appState.regularSeason &&
    !state.appState.tournament &&
    state.regularSeasonRecords.weeksPlayed < AMOUNT_SEASON_GAMES
  );
}

/** Which game phase the page is in, read from the store. */
function phaseOf(state: RootState): { label: string; signature: SignaturePhase } {
  if (!state.appState.tournament) {
    return { label: seasonPlaying(state) ? "regular season" : "selection sunday", signature: "season" };
  }
  // Same names GamePage uses for its own checks, so KNOWN_LAYOUT_ISSUES entries cover both.
  if (state.uiState.isRecapDialogOpen) return { label: "recap", signature: "bracket" };
  if (state.appState.tournamentRecap) return { label: "tournament finished", signature: "bracket" };
  return { label: "bracket picks", signature: "bracket" };
}

/**
 * The part of the state a resize must leave alone: everything except the window size.
 *
 * During regular-season playback the season moves on by itself while the resize is in flight, so
 * from a mid-playback snapshot only the parts playback never touches are compared: picks, UI,
 * team stats, schedule and the app flags other than `selectionSunday`. Left out are the week
 * results (`regularSeasonRecords`), the end-of-season flag and `tournament` (Selection Sunday
 * fills in the field and seeds as soon as the last week lands). There is no week boundary to pause
 * at: all 30 week timers fall due together and run back to back, blocking the page's main
 * thread for seconds. The test instead freezes the season before its first week with a paused
 * page clock, and makes one more resize as the weeks play (see the test body).
 */
function stablePart(state: RootState, midPlayback: boolean): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(state)) as Record<string, Record<string, unknown>>;
  delete copy.uiState.screenWidth;
  delete copy.uiState.screenHeight;
  if (midPlayback) {
    delete copy.regularSeasonRecords;
    delete copy.tournament;
    delete copy.appState.selectionSunday;
  }
  return copy;
}

/**
 * Resizes the window to `width` (height 900) and checks that the layout matches a fresh load at
 * that width while the game state is untouched. The one intended state change: on a bracket
 * screen, going wider than TOURNAMENT_BREAK_POINT selects round 1 (every round shows at once there;
 * `Tournament.tsx` dispatches `selectRound(1)`), so the selected round is expected to become 1.
 */
async function resizeAndCompare(page: Page, width: number): Promise<void> {
  const before = await readState(page);
  const phase = phaseOf(before);
  const midPlayback = seasonPlaying(before);
  const where = `${phase.label} @${width}px`;
  const expectedRound: TournamentRound =
    before.appState.tournament && width > TOURNAMENT_BREAK_POINT ? 1 : before.uiState.selectedRound;

  await page.setViewportSize({ width, height: HEIGHT });
  await expect
    .poll(async () => (await readState(page)).uiState.screenWidth, {
      message: `${where}: the app did not see the resize`,
      // Mid-playback the season sim holds the main thread, so the resize lands when it ends.
      timeout: midPlayback ? PHASE_TIMEOUTS.season : PICK_ACTION_TIMEOUT_MS,
    })
    .toBe(width);

  await expect
    .poll(() => layoutSignature(page), {
      message: `${where}: layout differs from a fresh load at this width`,
      timeout: PICK_ACTION_TIMEOUT_MS,
    })
    .toEqual(expectedSignature(width, phase.signature, expectedRound));
  // Bracket columns animate; the season screens have none (and while the test's page clock is
  // paused, animation frames do not run).
  if (phase.signature === "bracket") await waitForLayoutToSettle(page);

  const after = await readState(page);
  const expectedState = stablePart(before, midPlayback) as { uiState: Record<string, unknown> };
  expectedState.uiState.selectedRound = expectedRound;
  expect(stablePart(after, midPlayback), `${where}: game state changed across the resize`).toEqual(expectedState);
  if (midPlayback) {
    expect(after.regularSeasonRecords.weeksPlayed, `${where}: weeks played went backwards`).toBeGreaterThanOrEqual(
      before.regularSeasonRecords.weeksPlayed,
    );
  }

  await enforceLayout(page, phase.label, "horizontal-scroll", () => assertNoHorizontalScroll(page));
  if (phase.signature === "season") return;

  await assertRoundUnclipped(page, expectedRound);
  if (phase.label === "recap") {
    // The modal covers the banner; what must stay usable is the dialog itself.
    await assertUsable(page.getByRole("dialog", { name: "Tournament recap" }).getByRole("button", { name: "Play Again" }));
    return;
  }
  const banner = page.getByTestId("round-select-banner");
  if (!(await banner.isVisible())) return;
  await enforceLayout(page, phase.label, "round-navigation", async () => {
    await assertUsable(banner.locator('button[aria-current="true"]'));
    const index = BRACKET_ROUNDS.findIndex((r) => r.round === expectedRound);
    if (index <= 0) return;
    // A player must be able to get back to an earlier round: the back button, or failing that
    // the previous round's banner button.
    const back = banner.getByRole("button", { name: "Previous round" });
    if (await back.isVisible()) await assertUsable(back);
    else await assertUsable(banner.getByRole("button", { name: BRACKET_ROUNDS[index - 1].banner, exact: true }));
  });
}

/** Up through every width, back down, then home to the laptop width. */
async function sweep(page: Page): Promise<void> {
  const down = RESIZE_WIDTHS.slice(0, -1).reverse();
  for (const width of [...RESIZE_WIDTHS, ...down, HOME_WIDTH]) {
    await resizeAndCompare(page, width);
  }
}

const GAME_BUDGET_MS =
  Object.values(PHASE_TIMEOUTS).reduce((sum, ms) => sum + ms, 0) + 70 * PICK_ACTION_TIMEOUT_MS;

if (process.env.E2E_MEASURE_SIGNATURES) {
  // Measurement mode: prints the EXPECTED_SIGNATURES table instead of asserting against it.
  const toRow = (sig: LayoutSignature): Row => ({
    banner: sig.bannerVisible,
    columns: sig.visibleColumns.map((c) => c.replace("bracket-column-", "") as Column),
  });
  const settled = async (page: Page): Promise<Row> => {
    await waitForLayoutToSettle(page);
    return toRow(await layoutSignature(page));
  };
  for (const width of [...RESIZE_WIDTHS, HOME_WIDTH].sort((a, b) => a - b)) {
    test.describe(`measure ${width}px`, () => {
      test.use({ viewport: { width, height: HEIGHT } });
      test(`fresh-load layout signatures at ${width}px`, async ({ page, game }) => {
        test.setTimeout(GAME_BUDGET_MS + 120_000);
        await game.open();
        await game.start();
        await game.finishSeason();
        const season = await settled(page);
        await game.goToTournament();
        // Without the banner (wider than TOURNAMENT_BREAK_POINT) round 1 is the only selectable round.
        const hasBanner = await page.getByTestId("round-select-banner").isVisible();
        const rounds = hasBanner ? BRACKET_ROUNDS : BRACKET_ROUNDS.slice(0, 1);
        const bracket: Record<string, Row> = {};
        for (const round of rounds) {
          await showRound(page, round.round);
          bracket[String(round.round)] = await settled(page);
        }
        await game.makePicks(1);
        await game.playTournament();
        await game.openRecap();
        const recapRound = String((await readState(page)).uiState.selectedRound);
        expect(await settled(page), `recap at ${recapRound} matches picks`).toEqual(bracket[recapRound]);
        await game.closeRecap();
        for (const round of [...rounds].reverse()) {
          await showRound(page, round.round);
          expect(await settled(page), `played at ${String(round.round)} matches picks`).toEqual(
            bracket[String(round.round)],
          );
        }
        // One entry of EXPECTED_SIGNATURES, ready to paste.
        const format = (row: Row) =>
          `{ banner: ${row.banner}, columns: [${row.columns.map((c) => JSON.stringify(c)).join(", ")}] }`;
        const entries = Object.entries(bracket).map(
          ([round, row]) => `      ${/^\w+$/.test(round) ? round : JSON.stringify(round)}: ${format(row)},`,
        );
        console.log(
          [`  ${width}: {`, `    season: ${format(season)},`, "    bracket: {", ...entries, "    },", "  },"].join("\n"),
        );
      });
    });
  }
} else {
  test("layout follows live resizes in every phase", async ({ page, game }) => {
    test.setTimeout(GAME_BUDGET_MS + 300_000);
    expect(page.viewportSize()?.width, "starts at the laptop width").toBe(HOME_WIDTH);
    const timings: string[] = [];
    const timedSweep = async (label: string) => {
      const started = Date.now();
      await sweep(page);
      timings.push(`${label}=${Date.now() - started}ms`);
    };

    // 1. Regular season mid-playback. The 30 week timers all fall due together about 0.6 s after
    // the screen appears and then run back to back, holding the main thread for seconds; under
    // load that window is easily missed. So the page clock is faked (it runs normally except
    // while paused): pause it before Start, step it until the regular season screen is up and
    // its weeks are pending, sweep with the season frozen there, then let the clock run and
    // resize again straight away, so that resize lands while (or just after) the weeks play.
    await page.clock.install();
    await game.open();
    await page.clock.pauseAt(Date.now() + 1_000);
    const start = page.getByRole("button", { name: "Start the game" });
    await assertUsable(start);
    await start.click({ timeout: PICK_ACTION_TIMEOUT_MS });
    await expect
      .poll(
        async () => {
          const s = await readState(page);
          if (s.appState.regularSeason && !s.appState.transition) return true;
          await page.clock.runFor(100);
          return false;
        },
        { message: "phase: start -> regular season did not appear", timeout: PHASE_TIMEOUTS.toSeason, intervals: [50] },
      )
      .toBe(true);
    await expect(page.getByTestId("regular-season")).toBeVisible();
    await timedSweep("regularSeason");
    expect(
      (await readState(page)).regularSeasonRecords.weeksPlayed,
      "no week was played while the clock was paused",
    ).toBe(0);
    await page.clock.resume();
    await resizeAndCompare(page, RESIZE_WIDTHS[0]);
    console.log(
      `[resize] resize issued as the season resumed; weeks played once it applied: ${
        (await readState(page)).regularSeasonRecords.weeksPlayed
      }`,
    );
    await resizeAndCompare(page, HOME_WIDTH);

    // 2. Selection Sunday.
    await game.finishSeason();
    await timedSweep("selectionSunday");

    // 3. Picks: rounds 1 and 2 picked, round 2 selected.
    await game.goToTournament();
    await game.makePicks(1, {
      beforeRound: async (round) => {
        if (round !== "sweet sixteen") return;
        expect((await readState(page)).uiState.selectedRound, "round selected before the picks sweep").toBe(2);
        await timedSweep("picks");
      },
    });

    // 4. Tournament played, recap closed, a later round selected.
    await game.playTournament();
    await game.closeRecap();
    await showRound(page, "elite eight");
    expect((await readState(page)).uiState.selectedRound).toBe("elite eight");
    await timedSweep("played");

    // 5. Recap dialog open. The sweep above went past TOURNAMENT_BREAK_POINT, which selected
    // round 1; with round 1 selected the See Recap button sits off to the right of the bracket
    // grid (which does not scroll sideways), so go to the Finals round first, as a player would.
    await showRound(page, "finals");
    await game.openRecap();
    await timedSweep("recap");

    await checkScore(page, await checkHighlights(page));
    console.log(`[resize] sweep timings: ${timings.join(" ")}`);
  });
}
