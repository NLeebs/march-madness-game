import { describe, expect, it } from "vitest";
import type { TournamentRegion, TournamentRound } from "@/types";
import { getNextRoundInfo as appMapping } from "@/src/components/Tournament/TournamentMatchup";
import { getNextRoundInfo as e2eMapping } from "@/e2e/support/bracketMap";

type Case = [TournamentRound | "playin", TournamentRegion, number];

function everyGameTheAppHas(): Case[] {
  const cases: Case[] = [];
  const quadrants: TournamentRegion[] = ["west", "east", "south", "midwest"];
  const sizes: [TournamentRound, number][] = [
    [1, 8],
    [2, 4],
    ["sweet sixteen", 2],
    ["elite eight", 1],
  ];
  for (const [round, perRegion] of sizes) {
    for (const region of quadrants) {
      for (let i = 0; i < perRegion; i++) cases.push([round, region, i]);
    }
  }
  cases.push(["final four", "eastWest", 0], ["final four", "southMidwest", 0]);
  cases.push(["finals", "championship", 0]);
  return cases;
}

describe("e2e bracketMap copy of getNextRoundInfo", () => {
  it.each(everyGameTheAppHas())("agrees with the app for %s / %s / %i", (round, region, index) => {
    expect(e2eMapping(round, region, index)).toEqual(appMapping(round, region, index));
  });
});
