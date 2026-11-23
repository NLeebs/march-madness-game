import { describe, it, expect } from "vitest";
import {
  BRACKET_ROUNDS,
  getLayoutStep,
  getRoundLayout,
  type LayoutStep,
} from "@/src/functions/tournament/layout/bracketLayout";
import type { TournamentRound } from "@/types";

const ROUNDS: TournamentRound[] = [1, 2, "sweet sixteen", "elite eight", "final four", "finals", "champion"];

/** Expected step per width, for the rounds in ROUNDS order (characterizes Tournament.tsx's old ladder). */
const STEPS: [number, LayoutStep[]][] = [
  [390, [1, 2, 3, 4, 5, 6, null]],
  [768, [1, 2, 3, 4, 5, 6, null]],
  [769, [1, 2, 3, 4, 5, 5, 5]],
  [1024, [1, 2, 3, 4, 5, 5, 5]],
  [1025, [1, 2, 3, 4, 4, 4, 4]],
  [1400, [1, 2, 3, 4, 4, 4, 4]],
  [1401, [1, 2, 3, 3, 3, 3, 3]],
  [1700, [1, 2, 3, 3, 3, 3, 3]],
  [1701, [1, 2, 2, 2, 2, 2, 2]],
  [2040, [1, 2, 2, 2, 2, 2, 2]],
  [2041, [1, 1, 1, 1, 1, 1, 1]],
  [2350, [1, 1, 1, 1, 1, 1, 1]],
  [2351, [1, 1, 1, 1, 1, 1, 1]],
];

const POSITIONS: Record<string, (number | undefined)[]> = {
  "1": [1, 2, 3, 4, 5],
  "2": [0, 1, 2, 3, 4],
  "3": [0, 0, 1, 2, 3],
  "4": [0, 0, 0, 1, 2],
  "5": [0, 0, 0, 0, 1],
  "6": [0, 0, 0, 0, 0],
  null: [undefined, undefined, undefined, undefined, undefined],
};

const positions = (sel: TournamentRound, w: number) => {
  const layout = getRoundLayout(sel, w);
  return BRACKET_ROUNDS.map((r) => layout[r].position);
};
const expanded = (sel: TournamentRound, w: number) => {
  const layout = getRoundLayout(sel, w);
  return BRACKET_ROUNDS.map((r) => layout[r].expanded);
};

describe("getLayoutStep", () => {
  const cases = STEPS.flatMap(([w, steps]) => ROUNDS.map((sel, i) => [w, sel, steps[i]] as const));
  it.each(cases)("w=%i sel=%s -> step %s", (w, sel, step) => {
    expect(getLayoutStep(sel, w)).toBe(step);
  });
});

describe("getRoundLayout", () => {
  it("lists the bracket rounds left to right", () => {
    expect(BRACKET_ROUNDS).toEqual([1, 2, "sweet sixteen", "elite eight", "final four"]);
  });

  const cases = STEPS.flatMap(([w, steps]) => ROUNDS.map((sel, i) => [w, sel, steps[i]] as const));
  it.each(cases)("w=%i sel=%s positions follow step %s", (w, sel, step) => {
    expect(positions(sel, w)).toEqual(POSITIONS[String(step)]);
  });

  it("champion selected on a phone: no positions, elite eight and final four stay expanded", () => {
    expect(positions("champion", 390)).toEqual([undefined, undefined, undefined, undefined, undefined]);
    expect(expanded("champion", 390)).toEqual([false, false, false, true, true]);
  });

  it("finals selected at 768: every column collapsed", () => {
    expect(positions("finals", 768)).toEqual([0, 0, 0, 0, 0]);
    expect(expanded("finals", 768)).toEqual([false, false, false, false, false]);
  });

  it("finals selected at 769: final four expanded", () => {
    expect(positions("finals", 769)).toEqual([0, 0, 0, 0, 1]);
    expect(expanded("finals", 769)).toEqual([false, false, false, false, true]);
  });

  it("round 1 selected on a phone: every column expanded", () => {
    expect(positions(1, 390)).toEqual([1, 2, 3, 4, 5]);
    expect(expanded(1, 390)).toEqual([true, true, true, true, true]);
  });

  // expanded: R1 sel=1 || w>2040; R2 sel in {1,2} || w>1700; S16 sel in {1,2,S16} || w>1400;
  // E8 sel not in {F4, finals} || w>1024; F4 sel != finals || w>768
  const EXPANDED: [number, TournamentRound, boolean[]][] = [
    [2040, "finals", [false, true, true, true, true]],
    [2041, "finals", [true, true, true, true, true]],
    [1700, "final four", [false, false, true, true, true]],
    [1701, "final four", [false, true, true, true, true]],
    [1400, "elite eight", [false, false, false, true, true]],
    [1401, "elite eight", [false, false, true, true, true]],
    [1024, "final four", [false, false, false, false, true]],
    [1025, "final four", [false, false, false, true, true]],
    [390, 2, [false, true, true, true, true]],
    [390, "sweet sixteen", [false, false, true, true, true]],
    [390, "elite eight", [false, false, false, true, true]],
    [390, "final four", [false, false, false, false, true]],
  ];
  it.each(EXPANDED)("w=%i sel=%s expanded columns", (w, sel, exp) => {
    expect(expanded(sel, w)).toEqual(exp);
  });
});
