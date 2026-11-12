import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { readState } from "../support/state";

const MAX_SEASON_GAMES = 30;

type BarInfo = { team: string; record: string; trophy: boolean };

/**
 * Team bars of every conference group, keyed by group. Groups hidden at this width
 * (display: none) are returned only when `includeHidden` is true.
 */
async function conferenceGroups(page: Page, includeHidden: boolean): Promise<Record<string, BarInfo[]>> {
  return page.evaluate((withHidden) => {
    const out: Record<string, BarInfo[]> = {};
    document.querySelectorAll<HTMLElement>('[data-testid^="conference-group-"]').forEach((group) => {
      if (!withHidden && group.offsetParent === null) return; // hidden at this width
      const key = group.dataset.testid!.replace("conference-group-", "");
      out[key] = Array.from(group.querySelectorAll<HTMLElement>('[data-testid="team-bar"]')).map((bar) => ({
        team: bar.dataset.team ?? "",
        record: bar.querySelector('[data-testid="team-record"]')?.textContent?.trim() ?? "",
        trophy: bar.querySelector('[data-testid="conf-champion-icon"]') !== null,
      }));
    });
    return out;
  }, includeHidden);
}

const visibleGroups = (page: Page) => conferenceGroups(page, false);

function parseRecord(record: string): { wins: number; losses: number } | null {
  const match = /^(\d+)-(\d+)$/.exec(record);
  return match ? { wins: Number(match[1]), losses: Number(match[2]) } : null;
}

/**
 * At the end of the season (the screen is in its Selection Sunday view, where records still
 * show) every team's wins + losses equals the games scheduled for it (at most 30). Teams in
 * visible conference groups are checked from their on-screen record; teams in groups hidden
 * at this width fall back to state records. Guards make sure the on-screen part really ran.
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

  const visible = await visibleGroups(page);
  const visibleTeams = Object.values(visible).flat().map((bar) => bar.team);
  expect(visibleTeams.length, "team bars found on screen").toBeGreaterThan(0);
  const expectedVisible = state.teamSchedule.teamArray
    .filter((t) => t.conference in visible)
    .map((t) => t.team);
  expect([...visibleTeams].sort(), "on-screen teams vs teams of the visible conferences").toEqual(
    [...expectedVisible].sort(),
  );
  const hiddenTeams = Object.values(await conferenceGroups(page, true)).flat().map((bar) => bar.team);
  const covered = new Set([...visibleTeams, ...hiddenTeams]);
  const missing = Object.keys(scheduled).filter((team) => !covered.has(team));
  expect(missing, "scheduled teams in no conference group on the page").toEqual([]);
  for (const [team, expected] of Object.entries(scheduled)) {
    expect(expected, `${team}: scheduled games`).toBeLessThanOrEqual(MAX_SEASON_GAMES);
    const shown = onScreen.get(team);
    const parsed = shown !== undefined ? parseRecord(shown) : null;
    if (shown !== undefined) expect(parsed, `${team}: on-screen record "${shown}"`).not.toBeNull();
    const rec = state.regularSeasonRecords.records[team];
    expect(rec, `${team}: missing from regularSeasonRecords`).toBeDefined();
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
