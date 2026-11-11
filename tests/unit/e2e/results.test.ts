import { describe, it, expect } from "vitest";
import { ROUND_POINTS } from "@/store";
import { expectedScore } from "../../../e2e/support/scoring";

describe("expectedScore", () => {
  it("a correct champion-slot bar earns the finals points", () => {
    expect(expectedScore([{ round: "champion", correct: true }])).toBe(ROUND_POINTS.finals);
  });
  it("a correct round-2 bar earns the round-1 points", () => {
    expect(expectedScore([{ round: 2, correct: true }])).toBe(ROUND_POINTS[1]);
  });
  it("a correct final-four bar earns the elite-eight points", () => {
    expect(expectedScore([{ round: "final four", correct: true }])).toBe(ROUND_POINTS["elite eight"]);
  });
  it("wrong bars earn nothing and totals add up", () => {
    expect(expectedScore([{ round: "champion", correct: false }, { round: 2, correct: false }])).toBe(0);
    expect(
      expectedScore([
        { round: 2, correct: true },
        { round: "finals", correct: true },
        { round: "sweet sixteen", correct: false },
      ]),
    ).toBe(ROUND_POINTS[1] + ROUND_POINTS["final four"]);
  });
});
