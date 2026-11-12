import type { TournamentRegion, TournamentRound } from "@/types";

/**
 * Pure copy of the bracket wiring the app uses to place a winner in the next round
 * (`getNextRoundInfo` in src/components/Tournament/TournamentMatchup.tsx). It is copied rather
 * than imported because that file pulls React and Redux into Playwright's Node process.
 * tests/unit/e2e/bracketMap.test.ts fails if the two ever disagree.
 */
export type NextRoundInfo = {
  nextRoundRegion: TournamentRegion;
  teamIndex: number;
};

export function getNextRoundInfo(
  round: TournamentRound | "playin",
  region: TournamentRegion,
  index: number,
): NextRoundInfo {
  const regionMapping: Record<string, NextRoundInfo> = {
    "elite eight-west": { nextRoundRegion: "eastWest", teamIndex: 0 },
    "elite eight-east": { nextRoundRegion: "eastWest", teamIndex: 1 },
    "elite eight-south": { nextRoundRegion: "southMidwest", teamIndex: 0 },
    "elite eight-midwest": { nextRoundRegion: "southMidwest", teamIndex: 1 },
    "final four-eastWest": { nextRoundRegion: "championship", teamIndex: 0 },
    "final four-southMidwest": { nextRoundRegion: "championship", teamIndex: 1 },
    "finals-championship": { nextRoundRegion: "champion", teamIndex: 0 },
  };
  return regionMapping[`${round}-${region}`] ?? { nextRoundRegion: region, teamIndex: index };
}

export type BracketRound = {
  round: TournamentRound;
  /** Button name in the round select banner. */
  banner: string;
  testId: string;
  /** Round a winner of this round moves into. */
  next: TournamentRound;
  /** Games in this round. */
  games: number;
};

/** Rounds in which the player picks winners, in play order. */
export const BRACKET_ROUNDS: BracketRound[] = [
  { round: 1, banner: "Round of 64", testId: "bracket-column-1", next: 2, games: 32 },
  { round: 2, banner: "Round of 32", testId: "bracket-column-2", next: "sweet sixteen", games: 16 },
  {
    round: "sweet sixteen",
    banner: "Sweet Sixteen",
    testId: "bracket-column-sweet-sixteen",
    next: "elite eight",
    games: 8,
  },
  {
    round: "elite eight",
    banner: "Elite Eight",
    testId: "bracket-column-elite-eight",
    next: "final four",
    games: 4,
  },
  {
    round: "final four",
    banner: "Final Four",
    testId: "bracket-column-final-four",
    next: "finals",
    games: 2,
  },
  { round: "finals", banner: "Finals", testId: "bracket-column-finals", next: "champion", games: 1 },
];

/** Order in which regions are sorted when listing a round's games. */
export const REGION_ORDER: string[] = [
  "west",
  "east",
  "south",
  "midwest",
  "eastWest",
  "southMidwest",
  "championship",
  "champion",
];

export type Slot = {
  round: TournamentRound;
  region: TournamentRegion;
  /** Matchup within the region, as `data-matchup` shows it. */
  matchup: number;
  /** Side of that matchup (`data-value`). */
  side: number;
};

/** Where the winner of `round`/`region`/game `index` appears in the next round. */
export function nextSlot(round: TournamentRound, region: TournamentRegion, index: number): Slot {
  const info = BRACKET_ROUNDS.find((r) => r.round === round);
  if (!info) throw new Error(`no next round for ${String(round)}`);
  const { nextRoundRegion, teamIndex } = getNextRoundInfo(round, region, index);
  return {
    round: info.next,
    region: nextRoundRegion,
    matchup: Math.floor(teamIndex / 2),
    side: teamIndex % 2,
  };
}

export const PLAYIN_PLACEHOLDERS = [
  "playinGameSeed11Game1",
  "playinGameSeed11Game2",
  "playinGameSeed16Game1",
  "playinGameSeed16Game2",
];
