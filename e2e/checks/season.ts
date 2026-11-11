import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { readState } from "../support/state";

const MAX_SEASON_GAMES = 30;

type BarInfo = { team: string; record: string; trophy: boolean };

/** Every on-screen team bar inside a visible conference group, keyed by group. */
async function visibleGroups(page: Page): Promise<Record<string, BarInfo[]>> {
  return page.evaluate(() => {
    const out: Record<string, BarInfo[]> = {};
    document.querySelectorAll<HTMLElement>('[data-testid^="conference-group-"]').forEach((group) => {
      if (group.offsetParent === null) return; // hidden at this width
      const key = group.dataset.testid!.replace("conference-group-", "");
      out[key] = Array.from(group.querySelectorAll<HTMLElement>('[data-testid="team-bar"]')).map((bar) => ({
        team: bar.dataset.team ?? "",
        record: bar.querySelector('[data-testid="team-record"]')?.textContent?.trim() ?? "",
        trophy: bar.querySelector('[data-testid="conf-champion-icon"]') !== null,
      }));
    });
    return out;
  });
}

function parseRecord(record: string): { wins: number; losses: number } | null {
  const match = /^(\d+)-(\d+)$/.exec(record);
  return match ? { wins: Number(match[1]), losses: Number(match[2]) } : null;
}

/**
 * At the end of the season every team's wins + losses equals the games scheduled for it
 * (at most 30). Visible teams are checked on screen against the schedule; teams in hidden
 * conferences are checked from state records.
 */
export async function checkGameCounts(page: Page): Promise<void> {
  const state = await readState(page);
  const scheduled: Record<string, number> = {};
  for (const team of state.teamSchedule.teamArray) scheduled[team.team] = 0;
  for (const matchups of Object.values(state.teamSchedule.teamSchedules)) {
    for (const matchup of matchups) {
      for (const side of matchup) scheduled[side.team] = (scheduled[side.team] ?? 0) + 1;
    }
  }
  const onScreen = new Map<string, string>();
  for (const bars of Object.values(await visibleGroups(page))) {
    for (const bar of bars) onScreen.set(bar.team, bar.record);
  }
  expect(Object.keys(scheduled).length, "teams in schedule").toBeGreaterThan(0);
  for (const [team, expected] of Object.entries(scheduled)) {
    expect(expected, `${team}: scheduled games`).toBeLessThanOrEqual(MAX_SEASON_GAMES);
    const shown = onScreen.get(team);
    const parsed = shown !== undefined ? parseRecord(shown) : null;
    if (shown !== undefined) expect(parsed, `${team}: on-screen record "${shown}"`).not.toBeNull();
    const rec = state.regularSeasonRecords.records[team];
    const wins = parsed?.wins ?? rec.wins;
    const losses = parsed?.losses ?? rec.losses;
    expect(wins + losses, `${team}: games played (${wins}-${losses}) vs scheduled`).toBe(expected);
  }
}

/**
 * During Selection Sunday each visible conference shows exactly one trophy, on a team with the
 * most wins among the group's on-screen records (ties: any tied team passes).
 */
export async function checkConferenceChampions(page: Page): Promise<void> {
  const groups = await visibleGroups(page);
  expect(Object.keys(groups).length, "visible conference groups").toBeGreaterThan(0);
  for (const [key, bars] of Object.entries(groups)) {
    const wins = bars.map((bar) => {
      const parsed = parseRecord(bar.record);
      expect(parsed, `${key}/${bar.team}: on-screen record "${bar.record}"`).not.toBeNull();
      return parsed!.wins;
    });
    const trophies = bars.filter((bar) => bar.trophy);
    expect(trophies.map((t) => t.team), `${key}: teams showing a trophy`).toHaveLength(1);
    const best = Math.max(...wins);
    const champ = bars.findIndex((bar) => bar.trophy);
    expect(wins[champ], `${key}: champion ${trophies[0].team} wins vs best ${best}`).toBe(best);
  }
}
