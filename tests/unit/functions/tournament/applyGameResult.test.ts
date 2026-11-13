import { describe, it, expect } from "vitest";
import {
  applyGameResult,
  applyPlayinResult,
} from "@/src/functions/tournament/applyGameResult";
import { deepFreeze } from "./deepFreeze";
import type { BracketMatchups, TournamentRoundMatchups } from "@/types";

type Slot = Record<string, unknown>;
const t = (team: string, seed: number): Slot => ({ team, seed });
const game = (a: string, sa: number, b: string, sb: number): Slot[] => [
  t(a, sa),
  t(b, sb),
];

const roundOne = (): TournamentRoundMatchups =>
  ({
    west: [
      game("s01", 1, "playinGameSeed16Game1", 16),
      game("s32", 8, "s33", 9),
    ],
    east: [game("s02", 1, "playinGameSeed16Game2", 16)],
    south: [[], [], [], [], game("s17", 6, "playinGameSeed11Game1", 11)],
    midwest: [[], [], [], [], game("s18", 6, "playinGameSeed11Game2", 11)],
    playin: {
      elevenSeeds: [game("p11a", 11, "p11d", 11), game("p11b", 11, "p11c", 11)],
      sixteenSeeds: [game("p16a", 16, "p16d", 16), game("p16b", 16, "p16c", 16)],
    },
  }) as unknown as TournamentRoundMatchups;

const bracket = (): BracketMatchups =>
  ({
    roundOneMatchups: roundOne(),
    roundTwoMatchups: {
      west: [[], [], [], []],
      east: [[], [], [], []],
      south: [[], [], [], []],
      midwest: [[], [], [], []],
    },
    roundSweetSixteenMatchups: {},
    roundEliteEightMatchups: {
      west: [game("w1", 1, "w2", 2)],
      east: [game("e1", 1, "e2", 2)],
      south: [[]],
      midwest: [[]],
    },
    roundFinalFourMatchups: { eastWest: [[]], southMidwest: [[]] },
    roundFinalsMatchups: { championship: [[]] },
    champion: { champion: [[]] },
  }) as unknown as BracketMatchups;

const play = (seedType: "elevenSeeds" | "sixteenSeeds", gameIndex: number, winningTeam: string) =>
  applyPlayinResult(roundOne(), {
    seedType,
    gameIndex,
    winningTeam,
    winningScore: 70,
    losingScore: 65,
  });

describe("applyPlayinResult", () => {
  it("eleven game 0 winner replaces south[4][1].team", () => {
    const s = play("elevenSeeds", 0, "p11d");
    expect(s.south[4][1]).toEqual({ team: "p11d", seed: 11 });
    expect(s.midwest[4][1].team).toBe("playinGameSeed11Game2");
    expect(s.playin.elevenSeeds[0]).toEqual([
      { team: "p11a", seed: 11, score: 65, win: false },
      { team: "p11d", seed: 11, score: 70, win: true },
    ]);
    expect(s.playin.elevenSeeds[1]).toEqual(game("p11b", 11, "p11c", 11));
  });

  it("eleven game 1 winner replaces midwest[4][1].team", () => {
    const s = play("elevenSeeds", 1, "p11b");
    expect(s.midwest[4][1]).toEqual({ team: "p11b", seed: 11 });
    expect(s.south[4][1].team).toBe("playinGameSeed11Game1");
    expect(s.playin.elevenSeeds[1]).toEqual([
      { team: "p11b", seed: 11, score: 70, win: true },
      { team: "p11c", seed: 11, score: 65, win: false },
    ]);
  });

  it("sixteen game 0 winner replaces west[0][1].team", () => {
    const s = play("sixteenSeeds", 0, "p16a");
    expect(s.west[0][1]).toEqual({ team: "p16a", seed: 16 });
    expect(s.east[0][1].team).toBe("playinGameSeed16Game2");
    expect(s.playin.sixteenSeeds[0]).toEqual([
      { team: "p16a", seed: 16, score: 70, win: true },
      { team: "p16d", seed: 16, score: 65, win: false },
    ]);
  });

  it("sixteen game 1 winner replaces east[0][1].team", () => {
    const s = play("sixteenSeeds", 1, "p16c");
    expect(s.east[0][1]).toEqual({ team: "p16c", seed: 16 });
    expect(s.west[0][1].team).toBe("playinGameSeed16Game1");
    expect(s.playin.sixteenSeeds[1]).toEqual([
      { team: "p16b", seed: 16, score: 65, win: false },
      { team: "p16c", seed: 16, score: 70, win: true },
    ]);
  });

  it("does not mutate a frozen input", () => {
    const input = deepFreeze(roundOne());
    expect(() =>
      applyPlayinResult(input, {
        seedType: "elevenSeeds",
        gameIndex: 0,
        winningTeam: "p11d",
        winningScore: 70,
        losingScore: 65,
      })
    ).not.toThrow();
  });
});

describe("applyGameResult", () => {
  const result = (
    region: string,
    gameIndex: number,
    winningTeam: string,
    seed: string
  ) => ({
    region: region as "west",
    gameIndex,
    winningTeam,
    winningScore: 90,
    losingScore: 50,
    seed,
  });

  it("round 1: pushes the winner at floor(gameIndex/2) and sets score/win", () => {
    let b = bracket();
    b = applyGameResult(b, 1, result("west", 0, "s01", "1"));
    b = applyGameResult(b, 1, result("west", 1, "s33", "9"));
    expect(b.roundTwoMatchups.west).toEqual([
      [t("s01", 0), t("s33", 0)].map((x, i) => ({
        team: x.team,
        seed: i === 0 ? "1" : "9",
      })),
      [],
      [],
      [],
    ]);
    expect(b.roundOneMatchups.west[0]).toEqual([
      { team: "s01", seed: 1, score: 90, win: true },
      { team: "playinGameSeed16Game1", seed: 16, score: 50, win: false },
    ]);
    expect(b.roundOneMatchups.west[1]).toEqual([
      { team: "s32", seed: 8, score: 50, win: false },
      { team: "s33", seed: 9, score: 90, win: true },
    ]);
  });

  it("fills eastWest in dispatch order: east before west puts east in slot 0", () => {
    let b = bracket();
    b = applyGameResult(b, "elite eight", result("east", 0, "e1", "1"));
    b = applyGameResult(b, "elite eight", result("west", 0, "w1", "1"));
    expect(b.roundFinalFourMatchups.eastWest[0]).toEqual([
      { team: "e1", seed: "1" },
      { team: "w1", seed: "1" },
    ]);
  });

  it("advances through final four and finals", () => {
    let b = bracket();
    b.roundFinalFourMatchups = {
      eastWest: [game("a", 1, "b", 2)],
      southMidwest: [[]],
    } as never;
    b = applyGameResult(b, "final four", result("eastWest", 0, "a", "1"));
    expect(b.roundFinalsMatchups.championship[0]).toEqual([
      { team: "a", seed: "1" },
    ]);
    b.roundFinalsMatchups = { championship: [game("a", 1, "c", 3)] } as never;
    b = applyGameResult(b, "finals", result("championship", 0, "a", "1"));
    expect(b.champion.champion[0]).toEqual([{ team: "a", seed: "1" }]);
  });

  it("does not mutate a frozen input and shares untouched parts", () => {
    const input = deepFreeze(bracket());
    const out = applyGameResult(input, 1, result("west", 0, "s01", "1"));
    expect(out).not.toBe(input);
    expect(out.roundTwoMatchups.west[0]).toHaveLength(1);
    expect(input.roundTwoMatchups.west[0]).toHaveLength(0);
    expect(out.roundEliteEightMatchups).toBe(input.roundEliteEightMatchups);
    expect(out.roundOneMatchups.east).toBe(input.roundOneMatchups.east);
  });

  it("throws on a null region", () => {
    expect(() =>
      applyGameResult(bracket(), 1, { ...result("west", 0, "s01", "1"), region: null })
    ).toThrow();
  });
});
