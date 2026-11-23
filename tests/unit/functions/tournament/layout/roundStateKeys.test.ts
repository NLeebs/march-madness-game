import { describe, it, expect } from "vitest";
import {
  ROUND_STATE_KEYS,
  showsResults,
  type DisplayRound,
  type ResultsFlags,
} from "@/src/functions/tournament/layout/roundStateKeys";

describe("ROUND_STATE_KEYS", () => {
  it("maps each displayed round to its matchups and picks state", () => {
    expect(ROUND_STATE_KEYS).toEqual({
      playin: { matchupsKey: "roundOneMatchups", picksKey: "roundTwoPicks" },
      1: { matchupsKey: "roundOneMatchups", picksKey: "roundTwoPicks" },
      2: { matchupsKey: "roundTwoMatchups", picksKey: "roundTwoPicks" },
      "sweet sixteen": { matchupsKey: "roundSweetSixteenMatchups", picksKey: "roundSweetSixteenPicks" },
      "elite eight": { matchupsKey: "roundEliteEightMatchups", picksKey: "roundEliteEightPicks" },
      "final four": { matchupsKey: "roundFinalFourMatchups", picksKey: "roundFinalFourPicks" },
      finals: { matchupsKey: "roundFinalsMatchups", picksKey: "roundFinalsPicks" },
      champion: { matchupsKey: "champion", picksKey: "champion" },
    });
  });
});

const NONE: ResultsFlags = {
  tournamentPlayRoundTwo: false,
  tournamentPlaySweetSixteen: false,
  tournamentPlayEliteEight: false,
  tournamentPlayFinalFour: false,
  tournamentPlayFinals: false,
  tournamentRecap: false,
};

describe("showsResults", () => {
  it.each<DisplayRound>(["playin", 1])("%s always shows results", (round) => {
    expect(showsResults(round, NONE)).toBe(true);
  });

  const OWN_FLAG: [DisplayRound, keyof ResultsFlags][] = [
    [2, "tournamentPlayRoundTwo"],
    ["sweet sixteen", "tournamentPlaySweetSixteen"],
    ["elite eight", "tournamentPlayEliteEight"],
    ["final four", "tournamentPlayFinalFour"],
    ["finals", "tournamentPlayFinals"],
  ];
  it.each(OWN_FLAG)("%s shows picks until %s is on", (round, flag) => {
    expect(showsResults(round, NONE)).toBe(false);
    expect(showsResults(round, { ...NONE, [flag]: true })).toBe(true);
    expect(showsResults(round, { ...NONE, tournamentRecap: true })).toBe(true);
  });

  it("champion shows results only in the recap", () => {
    expect(showsResults("champion", { ...NONE, tournamentPlayFinals: true })).toBe(false);
    expect(showsResults("champion", { ...NONE, tournamentRecap: true })).toBe(true);
  });

  it("a round ignores the other rounds' flags", () => {
    expect(showsResults(2, { ...NONE, tournamentPlaySweetSixteen: true })).toBe(false);
  });
});
