import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { ROUND_POINTS } from "@/store";
import type { TournamentRound } from "@/types";
import { BRACKET_ROUNDS, PLAYIN_PLACEHOLDERS, nextSlot, type Slot } from "../support/bracketMap";
import type { FakeBackend } from "../support/fakeBackend";
import { ANON_USER_ID_STORAGE_KEY } from "../support/fakeAuth";
import type { RecordedPick } from "../support/game";
import { readState } from "../support/state";

type PlayinGame = { team: string; win?: boolean }[];
type PlayinMatchups = { elevenSeeds?: PlayinGame[]; sixteenSeeds?: PlayinGame[] };

/** Maps each play-in placeholder to the team that won that play-in game. */
function playinWinners(playin: PlayinMatchups): Record<string, string> {
  const winners: Record<string, string> = {};
  const groups: [string, PlayinGame[] | undefined][] = [
    ["11", playin.elevenSeeds],
    ["16", playin.sixteenSeeds],
  ];
  groups.forEach(([seed, games]) => {
    (games ?? []).forEach((game, i) => {
      const winner = game.find((t) => t.win === true);
      if (winner) winners[`playinGameSeed${seed}Game${i + 1}`] = winner.team;
    });
  });
  return winners;
}

const resolve = (winners: Record<string, string>, team: string) => winners[team] ?? team;

const PICKS_KEY: Partial<Record<TournamentRound, string>> = {
  2: "roundTwoPicks",
  "sweet sixteen": "roundSweetSixteenPicks",
  "elite eight": "roundEliteEightPicks",
  "final four": "roundFinalFourPicks",
  finals: "roundFinalsPicks",
  champion: "champion",
};

type BarInfo = { text: string; team: string; round: string; green: boolean; red: boolean; struck: boolean };

/**
 * Every pick bar (rounds 2 to champion) is green when its pick equals the team in its own
 * matchup card, red with a line-through otherwise. A play-in placeholder counts as equal to the
 * team it resolved to. Returns the points the app should show: each green bar in round R scores
 * ROUND_POINTS of the round before it.
 */
export async function checkHighlights(page: Page): Promise<number> {
  const winners = playinWinners((await readState(page)).tournament.roundOneMatchups.playin as PlayinMatchups);
  expect(Object.keys(winners), "all four play-in games have a winner").toHaveLength(PLAYIN_PLACEHOLDERS.length);

  const bars = await page.getByTestId("pick-bar").evaluateAll((els): BarInfo[] =>
    els.map((el) => {
      // The bar sits inside its matchup card, which carries data-team and holds the team button.
      const card = el.closest<HTMLElement>("[data-team]");
      const button = card?.querySelector<HTMLElement>("button[data-round]");
      return {
        text: (el.textContent ?? "").trim(),
        team: card?.dataset.team ?? "",
        round: button?.dataset.round ?? "",
        green: el.classList.contains("bg-green-100"),
        red: el.classList.contains("bg-red-100"),
        struck: el.classList.contains("line-through"),
      };
    }),
  );

  const expectedBars = BRACKET_ROUNDS.reduce((sum, r) => sum + r.games, 0);
  expect(bars, "one pick bar per team slot in rounds 2 to champion").toHaveLength(expectedBars);

  let total = 0;
  bars.forEach((bar, i) => {
    const label = `bar ${i} (round ${bar.round}, slot team "${bar.team}", pick "${bar.text}")`;
    const previous = BRACKET_ROUNDS.find((r) => String(r.next) === bar.round);
    expect(previous, `${label}: has a round before it`).toBeDefined();
    expect(bar.text, `${label}: has a pick`).not.toBe("");
    const equal = resolve(winners, bar.text) === resolve(winners, bar.team);
    if (equal) {
      expect(bar.green, `${label}: green`).toBe(true);
      expect(bar.red, `${label}: not red`).toBe(false);
      expect(bar.struck, `${label}: not struck through`).toBe(false);
      total += ROUND_POINTS[previous!.round as keyof typeof ROUND_POINTS];
    } else {
      expect(bar.red, `${label}: red`).toBe(true);
      expect(bar.struck, `${label}: struck through`).toBe(true);
      expect(bar.green, `${label}: not green`).toBe(false);
    }
  });
  return total;
}

/** The "Score" value on the page itself (not the copy inside the recap dialog). */
const pageScore = (page: Page): Locator =>
  page.locator('[data-testid="player-score-value"]:not([role="dialog"] *)');

export async function checkScore(page: Page, expected: number): Promise<void> {
  await expect(pageScore(page), "on-page score").toHaveText(String(expected));
}

export async function checkRecap(dialog: Locator, page: Page): Promise<void> {
  const state = await readState(page);
  const champion = state.tournament.champion.champion[0][0];
  const picked = state.tournamentPlayersPicks.picks.champion.champion[0][0].team;
  const stats = Object.values(state.teamStats.teamStats ?? {}).find((conf) => champion.team in conf);
  expect(stats, `champion ${champion.team} found in team stats`).toBeDefined();
  const logo = (stats as unknown as Record<string, { logo: string }>)[champion.team].logo;

  await expect(dialog.getByText("We Have a New Champ")).toBeVisible();
  await expect(dialog.getByText(`#${champion.seed} Seed`, { exact: true })).toBeVisible();
  // next/image serves the logo through /_next/image?url=<encoded path>.
  const src = (await dialog.getByRole("img", { name: "Champion's Logo" }).getAttribute("src")) ?? "";
  expect(decodeURIComponent(src), "champion logo src").toContain(logo);

  const verdict =
    champion.team === picked ? "And You're a Genius for Picking Them!" : `Not sure why you picked ${picked}`;
  await expect(dialog.getByText(verdict, { exact: true }), "champion verdict line").toBeVisible();

  const onPage = (await pageScore(page).innerText()).trim();
  await expect(dialog.getByTestId("player-score-value"), "dialog score equals on-page score").toHaveText(onPage);
}

/**
 * The one save request carries the right user and every pick the player made. `page` is needed
 * to read the anonymous id the app stored in localStorage.
 */
export async function checkPersistPayload(
  backend: FakeBackend,
  picks: RecordedPick[],
  expectUserId: string | null,
  page: Page,
): Promise<void> {
  await expect
    .poll(() => backend.persistRequests.length, { message: "bracket save request sent" })
    .toBeGreaterThanOrEqual(1);
  expect(backend.persistRequests, "exactly one save request").toHaveLength(1);
  const body = backend.persistRequests[0];

  expect(body.userId ?? null, "userId in payload").toBe(expectUserId);
  if (expectUserId === null) {
    const stored = await page.evaluate((key) => localStorage.getItem(key), ANON_USER_ID_STORAGE_KEY);
    expect(stored, "anonymous id stored in localStorage").toBeTruthy();
    expect(body.anonUserId, "anonUserId in payload").toBe(stored);
  }

  expect(body.picksState, "picksState in payload").toBeDefined();
  const winners = playinWinners(body.tournamentState.roundOneMatchups.playin as PlayinMatchups);
  const tree = body.picksState.picks as unknown as Record<string, Record<string, { team: string }[][]>>;
  picks.forEach((pick) => {
    const slot: Slot = nextSlot(pick.round, pick.region as Slot["region"], pick.slot);
    const key = PICKS_KEY[slot.round];
    const saved = key ? tree[key]?.[slot.region]?.[slot.matchup]?.[slot.side]?.team : undefined;
    expect(
      saved,
      `saved pick for ${String(pick.round)} ${pick.region} #${pick.slot} (${pick.team})`,
    ).toBe(resolve(winners, pick.team));
  });
}
