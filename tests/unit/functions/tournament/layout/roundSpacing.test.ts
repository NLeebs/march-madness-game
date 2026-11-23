import { describe, it, expect } from "vitest";
import { getRoundSpacing, type RoundSpacing } from "@/src/functions/tournament/layout/roundSpacing";
import type { TournamentRound } from "@/types";

/** (selectGap, selectPaddingTop, selectPaddingBottom, playGap, playPaddingTop, playPaddingBottom) */
type Tuple = [string, string, string, string, string, string];
const spacing = ([a, b, c, d, e, f]: Tuple): RoundSpacing => ({
  selectGap: a,
  selectPaddingTop: b,
  selectPaddingBottom: c,
  playGap: d,
  playPaddingTop: e,
  playPaddingBottom: f,
});

const cases: [string, number | "finals" | undefined, TournamentRound, number, RoundSpacing][] = [
  // positions 0 and 1 never change
  ["pos 0", 0, 2, 2040, spacing(["1rem", "0", "3rem", "3rem", "0", "4rem"])],
  ["pos 1", 1, 2, 2041, spacing(["1rem", "0", "3rem", "3rem", "0", "4rem"])],
  // position 2: <= 2040 takes the play override
  ["pos 2 at 2040", 2, 2, 2040, spacing(["9rem", "4rem", "7rem", "15.5rem", "6.5rem", "10rem"])],
  ["pos 2 at 2041", 2, 2, 2041, spacing(["9rem", "4rem", "7rem", "10.5rem", "3.75rem", "7.75rem"])],
  ["pos 2 round 1 selected", 2, 1, 390, spacing(["9rem", "4rem", "7rem", "10.5rem", "3.75rem", "7.75rem"])],
  ["pos 2 finals at 1400", 2, "finals", 1400, spacing(["9rem", "6rem", "7rem", "15.5rem", "7rem", "10rem"])],
  ["pos 2 finals at 1401", 2, "finals", 1401, spacing(["9rem", "4rem", "7rem", "15.5rem", "6.5rem", "10rem"])],
  // position 3
  ["pos 3 at 2040", 3, 2, 2040, spacing(["25rem", "12rem", "15rem", "18rem", "19rem", "22.5rem"])],
  ["pos 3 at 2041", 3, 2, 2041, spacing(["25rem", "12rem", "15rem", "30.5rem", "14rem", "17rem"])],
  ["pos 3 sweet sixteen at 1700", 3, "sweet sixteen", 1700, spacing(["25rem", "12rem", "15rem", "18rem", "20rem", "22.5rem"])],
  ["pos 3 sweet sixteen at 1701", 3, "sweet sixteen", 1701, spacing(["25rem", "12rem", "15rem", "18rem", "19rem", "22.5rem"])],
  // position 4: strict < 2040
  ["pos 4 at 2039", 4, 2, 2039, spacing(["25rem", "28rem", "31rem", "15.5rem", "44.5rem", "36.75rem"])],
  ["pos 4 at 2040", 4, 2, 2040, spacing(["25rem", "28rem", "31rem", "0", "33.75rem", "36.75rem"])],
  ["pos 4 at 2041", 4, 2, 2041, spacing(["25rem", "28rem", "31rem", "0", "33.75rem", "36.75rem"])],
  // position 5
  ["pos 5", 5, 2, 2040, spacing(["0", "62rem", "62rem", "0", "75rem", "75rem"])],
  // finals column, by layout step
  ["finals step 1 at 2350", "finals", 1, 2350, spacing(["0", "128rem", "0", "0", "157rem", "0"])],
  ["finals step 1 at 2351", "finals", 1, 2351, spacing(["0", "62rem", "0", "0", "75rem", "0"])],
  ["finals step 2", "finals", 2, 390, spacing(["0", "64rem", "0", "0", "97rem", "0"])],
  ["finals step 3", "finals", "sweet sixteen", 390, spacing(["0", "33rem", "0", "0", "47rem", "0"])],
  ["finals step 4", "finals", "elite eight", 390, spacing(["0", "17rem", "0", "0", "22rem", "0"])],
  ["finals step 5", "finals", "final four", 390, spacing(["0", "6rem", "0", "0", "9rem", "0"])],
  ["finals step 6", "finals", "finals", 768, spacing(["1rem", "0", "0", "3rem", "0", "0"])],
  ["finals no step", "finals", "champion", 390, spacing(["1rem", "0", "0", "3rem", "0", "0"])],
];

describe("getRoundSpacing", () => {
  it.each(cases)("%s", (_name, position, sel, w, expected) => {
    expect(getRoundSpacing(position, sel, w)).toEqual(expected);
  });

  it("returns nothing for a round without a position (wide play-in)", () => {
    expect(getRoundSpacing(undefined, 1, 2400)).toEqual({});
  });
});
