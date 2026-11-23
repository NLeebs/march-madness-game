import { describe, it, expect } from "vitest";
import {
  getReplayRound,
  type ReplayFlags,
} from "@/src/functions/tournament/getReplayRound";
import { deepFreeze } from "./deepFreeze";
import type { ScoredRound } from "@/types";

const FLAG_ORDER = [
  "tournamentPlayRoundOne",
  "tournamentPlayRoundTwo",
  "tournamentPlaySweetSixteen",
  "tournamentPlayEliteEight",
  "tournamentPlayFinalFour",
  "tournamentPlayFinals",
  "tournamentRecap",
] as const;

/** The first `count` flags on, the rest off (how the game sets them). */
const flags = (count: number): ReplayFlags =>
  deepFreeze(
    Object.fromEntries(FLAG_ORDER.map((f, i) => [f, i < count])) as ReplayFlags,
  );

describe("getReplayRound", () => {
  const cases: [number, ScoredRound | null][] = [
    [0, null],
    [1, 1],
    [2, 2],
    [3, "sweet sixteen"],
    [4, "elite eight"],
    [5, "final four"],
    [6, "finals"],
    [7, null],
  ];
  it.each(cases)("with the first %i flags on returns %s", (count, expected) => {
    expect(getReplayRound(flags(count))).toBe(expected);
  });

  it("checks only a round's own flag and the next one, like the old per-round effects", () => {
    const only = deepFreeze({ ...flags(0), tournamentPlayRoundTwo: true });
    expect(getReplayRound(only)).toBe(2);
  });
});
