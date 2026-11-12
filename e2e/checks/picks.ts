import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { TournamentRound } from "@/types";
import type { RecordedPick } from "../support/game";
import { BRACKET_ROUNDS, nextSlot, type BracketRound, type Slot } from "../support/bracketMap";
import { readState } from "../support/state";
import { assertUsable } from "../support/layout";
import { PICK_ACTION_TIMEOUT_MS } from "../support/timeouts";

const PICK_KEYS = [
  "roundTwoPicks",
  "roundSweetSixteenPicks",
  "roundEliteEightPicks",
  "roundFinalFourPicks",
  "roundFinalsPicks",
  "champion",
] as const;

const attr = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/** The team button of one side of one game, found from data attributes (not DOM position). */
export function teamButton(
  page: Page,
  at: { round: TournamentRound | "playin"; region: string; matchup: number; side: number },
): Locator {
  return page.locator(
    `button.team-selection[data-round="${String(at.round)}"][data-region="${at.region}"]` +
      `[data-matchup="${at.matchup}"][data-value="${at.side}"]`,
  );
}

function roundInfo(round: TournamentRound): BracketRound {
  const info = BRACKET_ROUNDS.find((r) => r.round === round);
  if (!info) throw new Error(`not a pick round: ${String(round)}`);
  return info;
}

/**
 * Brings `round`'s column into view when the round banner shows (narrower than 2350px).
 * Banner buttons of earlier rounds shrink to nothing once a later round is selected, so going
 * back to an earlier round uses the back button, as a player would.
 */
export async function showRound(page: Page, round: TournamentRound): Promise<void> {
  const banner = page.getByTestId("round-select-banner");
  if (!(await banner.isVisible())) return;
  const target = roundInfo(round);
  const targetIndex = BRACKET_ROUNDS.indexOf(target);
  const selected = banner.locator('button[aria-current="true"]');
  const back = banner.getByRole("button", { name: "Previous round" });
  const selectedName = (await selected.count()) === 1 ? (await selected.innerText()).trim() : "";
  const selectedIndex = BRACKET_ROUNDS.findIndex((r) => r.banner === selectedName);
  if (selectedIndex > targetIndex && (await back.isVisible())) {
    for (let i = selectedIndex; i > targetIndex; i--) {
      await assertUsable(back);
      await back.click({ timeout: PICK_ACTION_TIMEOUT_MS });
      await expect(selected, "back button: previous round not selected").toHaveText(
        BRACKET_ROUNDS[i - 1].banner,
        { timeout: PICK_ACTION_TIMEOUT_MS },
      );
    }
  } else {
    const bannerButton = banner.getByRole("button", { name: target.banner, exact: true });
    await assertUsable(bannerButton);
    await bannerButton.click({ timeout: PICK_ACTION_TIMEOUT_MS });
  }
}

/**
 * After picking `pick.team` to win its game, the winner shows in the next round's slot given by
 * the bracket wiring: right round, right region, right matchup, right side. Reads attributes
 * only, so it works for columns that are collapsed at this width.
 */
export async function checkPickLandsInNextSlot(page: Page, pick: RecordedPick): Promise<void> {
  const slot = nextSlot(pick.round, pick.region as Slot["region"], pick.slot);
  const where = `${String(slot.round)} / ${slot.region} / matchup ${slot.matchup} / side ${slot.side}`;
  await expect(
    teamButton(page, slot),
    `${pick.team} (won ${String(pick.round)} ${pick.region} #${pick.slot}) should land in ${where}`,
  ).toHaveAttribute("data-team", pick.team, { timeout: PICK_ACTION_TIMEOUT_MS });
}

function teamsIn(node: unknown, found: string[] = []): string[] {
  if (Array.isArray(node)) {
    node.forEach((child) => teamsIn(child, found));
  } else if (node && typeof node === "object") {
    Object.entries(node).forEach(([key, value]) => {
      if (key === "team" && typeof value === "string" && value !== "") found.push(value);
      else teamsIn(value, found);
    });
  }
  return found;
}

type Position = { region: string; matchup: number; side: number; opponent: string };

/** Where `team` sits in `round`, read from the buttons' data attributes. */
async function findTeam(page: Page, round: TournamentRound, team: string): Promise<Position> {
  const own = page.locator(`button.team-selection[data-round="${String(round)}"][data-team="${attr(team)}"]`);
  await expect(own, `${team} should be in ${String(round)} exactly once`).toHaveCount(1, {
    timeout: PICK_ACTION_TIMEOUT_MS,
  });
  const region = (await own.getAttribute("data-region")) ?? "";
  const matchup = Number(await own.getAttribute("data-matchup"));
  const side = Number(await own.getAttribute("data-value"));
  const rival = teamButton(page, { round, region, matchup, side: 1 - side });
  const opponent = (await rival.getAttribute("data-team")) ?? "";
  return { region, matchup, side, opponent };
}

async function pickTeam(page: Page, round: TournamentRound, team: string): Promise<RecordedPick> {
  const at = await findTeam(page, round, team);
  await showRound(page, round);
  const button = teamButton(page, { round, region: at.region, matchup: at.matchup, side: at.side });
  await assertUsable(button);
  await button.click({ timeout: PICK_ACTION_TIMEOUT_MS });
  const pick: RecordedPick = { round, region: at.region, slot: at.matchup, team };
  await checkPickLandsInNextSlot(page, pick);
  return pick;
}

/**
 * Changing an earlier pick removes the replaced team from every later round. Takes the team
 * picked furthest along, switches its round-1 game to the other team, and checks that the team
 * is gone from every later round (state and buttons) while nothing else moved. Then puts the
 * original picks back, so the bracket ends as it started.
 */
export async function checkCascadeClears(page: Page): Promise<void> {
  const before = (await readState(page)).tournamentPlayersPicks.picks;
  const wins = new Map<string, number>();
  for (const key of PICK_KEYS) {
    for (const team of Array.from(new Set(teamsIn(before[key])))) wins.set(team, (wins.get(team) ?? 0) + 1);
  }
  const [team, rounds] = Array.from(wins.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? [
    "",
    0,
  ];
  expect(rounds, `cascade check needs a team advanced at least two rounds (best: ${team})`).toBeGreaterThanOrEqual(2);

  const roundOne = await findTeam(page, 1, team);
  expect(roundOne.opponent, `${team}'s round-1 opponent`).not.toBe("");
  await pickTeam(page, 1, roundOne.opponent);

  const after = (await readState(page)).tournamentPlayersPicks.picks;
  for (const key of PICK_KEYS) {
    const expected = teamsIn(before[key]).filter((t) => t !== team);
    if (key === "roundTwoPicks") expected.push(roundOne.opponent);
    expect(
      teamsIn(after[key]).sort(),
      `${key}: only ${team} should be removed${key === "roundTwoPicks" ? " and replaced by its opponent" : ""}`,
    ).toEqual(expected.sort());
  }
  await expect(
    page.locator(
      `button.team-selection[data-team="${attr(team)}"]:not([data-round="1"]):not([data-round="playin"])`,
    ),
    `${team} should be gone from every round after round 1`,
  ).toHaveCount(0, { timeout: PICK_ACTION_TIMEOUT_MS });

  for (const info of BRACKET_ROUNDS.slice(0, rounds)) {
    await pickTeam(page, info.round, team);
  }
  const restored = (await readState(page)).tournamentPlayersPicks.picks;
  expect(restored, "picks after putting the original picks back").toEqual(before);
}
