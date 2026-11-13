import { describe, it, expect } from "vitest";
import { seedTournament } from "@/src/functions/tournament/seedTournament";
import { buildRoundOneMatchups } from "@/src/functions/tournament/buildRoundOneMatchups";
import { deepFreeze } from "./deepFreeze";

const pad = (n: number) => String(n).padStart(2, "0");
const SIXTY = Array.from({ length: 60 }, (_, i) => `s${pad(i + 1)}`);
const PLAYIN = {
  elevenSeeds: ["p11a", "p11b", "p11c", "p11d"],
  sixteenSeeds: ["p16a", "p16b", "p16c", "p16d"],
};

const m = (a: string, sa: number, b: string, sb: number) => [
  { team: a, seed: sa },
  { team: b, seed: sb },
];

describe("seedTournament", () => {
  const seeds = seedTournament(deepFreeze([...SIXTY]));

  it("builds the exact west array", () => {
    expect(seeds.west).toEqual([
      "s01", "s08", "s09", "s16", "s17", "s24", "s25", "s32",
      "s33", "s40", "s41", "s46", "s47", "s54", "s55", "playinGameSeed16Game1",
    ]);
  });

  it("builds the exact east array", () => {
    expect(seeds.east).toEqual([
      "s02", "s07", "s10", "s15", "s18", "s23", "s26", "s31",
      "s34", "s39", "s42", "s45", "s48", "s53", "s56", "playinGameSeed16Game2",
    ]);
  });

  it("builds the exact south array with the 11 play-in at index 10", () => {
    expect(seeds.south).toEqual([
      "s03", "s06", "s11", "s14", "s19", "s22", "s27", "s30",
      "s35", "s38", "playinGameSeed11Game1", "s44", "s49", "s52", "s57", "s60",
    ]);
  });

  it("builds the exact midwest array with the 11 play-in at index 10", () => {
    expect(seeds.midwest).toEqual([
      "s04", "s05", "s12", "s13", "s20", "s21", "s28", "s29",
      "s36", "s37", "playinGameSeed11Game2", "s43", "s50", "s51", "s58", "s59",
    ]);
  });
});

describe("buildRoundOneMatchups", () => {
  const seeds = deepFreeze(seedTournament(SIXTY));
  const result = buildRoundOneMatchups(seeds, deepFreeze({ ...PLAYIN }));

  it("orders west as 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15", () => {
    expect(result.west).toEqual([
      m("s01", 1, "playinGameSeed16Game1", 16),
      m("s32", 8, "s33", 9),
      m("s17", 5, "s46", 12),
      m("s16", 4, "s47", 13),
      m("s24", 6, "s41", 11),
      m("s09", 3, "s54", 14),
      m("s25", 7, "s40", 10),
      m("s08", 2, "s55", 15),
    ]);
  });

  it("orders east", () => {
    expect(result.east).toEqual([
      m("s02", 1, "playinGameSeed16Game2", 16),
      m("s31", 8, "s34", 9),
      m("s18", 5, "s45", 12),
      m("s15", 4, "s48", 13),
      m("s23", 6, "s42", 11),
      m("s10", 3, "s53", 14),
      m("s26", 7, "s39", 10),
      m("s07", 2, "s56", 15),
    ]);
  });

  it("orders south (11 play-in placeholder in the 6v11 game)", () => {
    expect(result.south).toEqual([
      m("s03", 1, "s60", 16),
      m("s30", 8, "s35", 9),
      m("s19", 5, "s44", 12),
      m("s14", 4, "s49", 13),
      m("s22", 6, "playinGameSeed11Game1", 11),
      m("s11", 3, "s52", 14),
      m("s27", 7, "s38", 10),
      m("s06", 2, "s57", 15),
    ]);
  });

  it("orders midwest (11 play-in placeholder in the 6v11 game)", () => {
    expect(result.midwest).toEqual([
      m("s04", 1, "s59", 16),
      m("s29", 8, "s36", 9),
      m("s20", 5, "s43", 12),
      m("s13", 4, "s50", 13),
      m("s21", 6, "playinGameSeed11Game2", 11),
      m("s12", 3, "s51", 14),
      m("s28", 7, "s37", 10),
      m("s05", 2, "s58", 15),
    ]);
  });

  it("pairs play-in teams [0] v [3] and [1] v [2] with seed 11 / 16", () => {
    expect(result.playin.elevenSeeds).toEqual([
      m("p11a", 11, "p11d", 11),
      m("p11b", 11, "p11c", 11),
    ]);
    expect(result.playin.sixteenSeeds).toEqual([
      m("p16a", 16, "p16d", 16),
      m("p16b", 16, "p16c", 16),
    ]);
  });
});
