import { describe, it, expect } from "vitest";
import {
  ALL_PLAYIN_PLACEHOLDERS,
  PLAYIN_PLACEHOLDERS,
  PLAYIN_ROUND_ONE_SLOTS,
  ROUND_CONFIG,
  SCORED_ROUNDS,
  SEED_REGIONS,
  nextRegionOf,
} from "@/src/functions/tournament/roundConfig";

describe("ROUND_CONFIG", () => {
  it("lists the scored rounds in order", () => {
    expect(SCORED_ROUNDS).toEqual([
      1,
      2,
      "sweet sixteen",
      "elite eight",
      "final four",
      "finals",
    ]);
    expect(SEED_REGIONS).toEqual(["west", "east", "south", "midwest"]);
  });

  it("encodes every round's keys", () => {
    expect(ROUND_CONFIG).toEqual({
      1: {
        matchupsKey: "roundOneMatchups",
        nextMatchupsKey: "roundTwoMatchups",
        nextPicksKey: "roundTwoPicks",
        laterPicksKeys: [
          "roundSweetSixteenPicks",
          "roundEliteEightPicks",
          "roundFinalFourPicks",
          "roundFinalsPicks",
          "champion",
        ],
        advance: {},
      },
      2: {
        matchupsKey: "roundTwoMatchups",
        nextMatchupsKey: "roundSweetSixteenMatchups",
        nextPicksKey: "roundSweetSixteenPicks",
        laterPicksKeys: [
          "roundEliteEightPicks",
          "roundFinalFourPicks",
          "roundFinalsPicks",
          "champion",
        ],
        advance: {},
      },
      "sweet sixteen": {
        matchupsKey: "roundSweetSixteenMatchups",
        nextMatchupsKey: "roundEliteEightMatchups",
        nextPicksKey: "roundEliteEightPicks",
        laterPicksKeys: ["roundFinalFourPicks", "roundFinalsPicks", "champion"],
        advance: {},
      },
      "elite eight": {
        matchupsKey: "roundEliteEightMatchups",
        nextMatchupsKey: "roundFinalFourMatchups",
        nextPicksKey: "roundFinalFourPicks",
        laterPicksKeys: ["roundFinalsPicks", "champion"],
        advance: {
          west: { region: "eastWest", teamIndex: 0 },
          east: { region: "eastWest", teamIndex: 1 },
          south: { region: "southMidwest", teamIndex: 0 },
          midwest: { region: "southMidwest", teamIndex: 1 },
        },
      },
      "final four": {
        matchupsKey: "roundFinalFourMatchups",
        nextMatchupsKey: "roundFinalsMatchups",
        nextPicksKey: "roundFinalsPicks",
        laterPicksKeys: ["champion"],
        advance: {
          eastWest: { region: "championship", teamIndex: 0 },
          southMidwest: { region: "championship", teamIndex: 1 },
        },
      },
      finals: {
        matchupsKey: "roundFinalsMatchups",
        nextMatchupsKey: "champion",
        nextPicksKey: "champion",
        laterPicksKeys: [],
        advance: { championship: { region: "champion", teamIndex: 0 } },
      },
    });
  });

  it("nextRegionOf maps elite eight, final four and finals regions and leaves earlier rounds alone", () => {
    expect(nextRegionOf("elite eight", "west")).toBe("eastWest");
    expect(nextRegionOf("elite eight", "east")).toBe("eastWest");
    expect(nextRegionOf("elite eight", "south")).toBe("southMidwest");
    expect(nextRegionOf("elite eight", "midwest")).toBe("southMidwest");
    expect(nextRegionOf("final four", "eastWest")).toBe("championship");
    expect(nextRegionOf("final four", "southMidwest")).toBe("championship");
    expect(nextRegionOf("finals", "championship")).toBe("champion");
    for (const round of [1, 2, "sweet sixteen"] as const) {
      expect(nextRegionOf(round, "west")).toBe("west");
      expect(nextRegionOf(round, "midwest")).toBe("midwest");
    }
  });
});

describe("play-in constants", () => {
  it("names the placeholders and their round one slots", () => {
    expect(PLAYIN_PLACEHOLDERS).toEqual({
      elevenSeeds: ["playinGameSeed11Game1", "playinGameSeed11Game2"],
      sixteenSeeds: ["playinGameSeed16Game1", "playinGameSeed16Game2"],
    });
    expect(PLAYIN_ROUND_ONE_SLOTS).toEqual({
      elevenSeeds: [
        { region: "south", game: 4 },
        { region: "midwest", game: 4 },
      ],
      sixteenSeeds: [
        { region: "west", game: 0 },
        { region: "east", game: 0 },
      ],
    });
    expect([...ALL_PLAYIN_PLACEHOLDERS].sort()).toEqual([
      "playinGameSeed11Game1",
      "playinGameSeed11Game2",
      "playinGameSeed16Game1",
      "playinGameSeed16Game2",
    ]);
  });
});
