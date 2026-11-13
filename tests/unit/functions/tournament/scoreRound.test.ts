import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROUND_POINTS, scoreRound } from "@/src/functions/tournament/scoreRound";
import { deepFreeze } from "./deepFreeze";

const slots = (matchups: string[][]) =>
  matchups.map((m) => m.map((team) => ({ team })));

describe("scoreRound", () => {
  it("exports the points per correct pick for each round", () => {
    expect(ROUND_POINTS).toEqual({
      1: 10,
      2: 20,
      "sweet sixteen": 40,
      "elite eight": 80,
      "final four": 160,
      finals: 320,
    });
  });

  it.each([
    [1, 10],
    [2, 20],
    ["sweet sixteen", 40],
    ["elite eight", 80],
    ["final four", 160],
  ] as const)("round %s awards %i per correct pick", (round, pts) => {
    const advanced = { west: slots([["A", "B"], ["C", "D"]]) };
    const picks = { west: slots([["A", "X"], ["C", "D"]]) };
    const result = scoreRound({
      round,
      advanced,
      picks,
      winningTeams: ["A", "B", "C", "D"],
      points: ROUND_POINTS,
    });
    expect(result.correct).toEqual({ west: [[true, false], [true, true]] });
    expect(result.points).toBe(3 * pts);
  });

  it("awards 320 for the finals pick", () => {
    const result = scoreRound({
      round: "finals",
      advanced: { champion: slots([["A"]]) },
      picks: { champion: slots([["A"]]) },
      winningTeams: ["A"],
      points: ROUND_POINTS,
    });
    expect(result).toEqual({ correct: { champion: [[true]] }, points: 320 });
  });

  it("scores a wrong pick as 0", () => {
    const result = scoreRound({
      round: "finals",
      advanced: { champion: slots([["A"]]) },
      picks: { champion: slots([["B"]]) },
      winningTeams: ["A"],
      points: ROUND_POINTS,
    });
    expect(result).toEqual({ correct: { champion: [[false]] }, points: 0 });
  });

  it("walks the advanced matchups, so empty advanced scores nothing", () => {
    const result = scoreRound({
      round: 1,
      advanced: { west: [[], [], [], []] },
      picks: { west: slots([["A", "B"]]) },
      winningTeams: ["A", "B"],
      points: ROUND_POINTS,
    });
    expect(result.points).toBe(0);
  });

  it("uses the points table it is given", () => {
    const result = scoreRound({
      round: 1,
      advanced: { west: slots([["A", "B"]]) },
      picks: { west: slots([["A", "B"]]) },
      winningTeams: ["A", "B"],
      points: { ...ROUND_POINTS, 1: 7 },
    });
    expect(result.points).toBe(14);
  });

  it("does not mutate frozen input", () => {
    const input = deepFreeze({
      round: 1 as const,
      advanced: { west: slots([["A", "B"]]) },
      picks: { west: slots([["A", "B"]]) },
      winningTeams: ["A"],
      points: { ...ROUND_POINTS },
    });
    expect(() => scoreRound(input)).not.toThrow();
  });

  it("has no runtime imports", () => {
    const src = readFileSync("src/functions/tournament/scoreRound.ts", "utf8");
    const imports = src.split(/\r?\n/).filter((l) => /^import\s/.test(l));
    imports.forEach((l) => expect(l).toMatch(/^import type\s/));
  });
});
