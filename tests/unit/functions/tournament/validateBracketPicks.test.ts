import { describe, it, expect } from "vitest";
import { validateBracketPicks } from "@/src/functions/tournament/validateBracketPicks";
import { buildRoundOneMatchups } from "@/src/functions/tournament/buildRoundOneMatchups";
import { seedTournament } from "@/src/functions/tournament/seedTournament";
import { PLAYIN_PLACEHOLDERS } from "@/src/functions/tournament/roundConfig";
import { buildLeague, chalkPicks } from "@/tests/factories";
import type { TournamentPicks } from "@/types";

const league = buildLeague();
const teamNames = Object.values(league.teamStats).flatMap((conf) =>
  Object.keys(conf)
);
const roundOne = buildRoundOneMatchups(seedTournament(teamNames.slice(0, 60)), {
  elevenSeeds: teamNames.slice(60, 64),
  sixteenSeeds: teamNames.slice(64, 68),
});
const clone = (p: TournamentPicks): TournamentPicks =>
  JSON.parse(JSON.stringify(p));

describe("validateBracketPicks", () => {
  it("chalk picks are valid", () => {
    expect(validateBracketPicks(roundOne, chalkPicks(roundOne))).toEqual([]);
  });

  it("placeholder picked through to the final is valid", () => {
    const slot = { team: PLAYIN_PLACEHOLDERS.sixteenSeeds[0], seed: "16" };
    const picks = clone(chalkPicks(roundOne));
    picks.roundTwoPicks.west![0][0] = slot;
    picks.roundSweetSixteenPicks.west![0][0] = slot;
    picks.roundEliteEightPicks.west![0][0] = slot;
    picks.roundFinalFourPicks.eastWest![0][0] = slot;
    picks.roundFinalsPicks.championship![0][0] = slot;
    picks.champion.champion![0][0] = slot;
    expect(validateBracketPicks(roundOne, picks)).toEqual([]);
  });

  it("an empty slot is reported", () => {
    const picks = clone(chalkPicks(roundOne));
    picks.roundTwoPicks.west![0][0] = { team: "", seed: "" };
    expect(validateBracketPicks(roundOne, picks).length).toBeGreaterThan(0);
  });

  it("a round-two pick that is not in its round-one game is reported", () => {
    const picks = clone(chalkPicks(roundOne));
    picks.roundTwoPicks.west![0][0] = { team: "Nobody", seed: "5" };
    expect(validateBracketPicks(roundOne, picks).length).toBeGreaterThan(0);
  });

  it("a later pick that is neither feeder pick is reported", () => {
    const picks = clone(chalkPicks(roundOne));
    const other = picks.roundTwoPicks.east![0][0];
    picks.roundSweetSixteenPicks.west![0][0] = { ...other };
    expect(validateBracketPicks(roundOne, picks).length).toBeGreaterThan(0);
  });

  it("a pick whose seed differs from the team seed is reported", () => {
    const picks = clone(chalkPicks(roundOne));
    const s = picks.roundTwoPicks.west![0][0];
    picks.roundTwoPicks.west![0][0] = { team: s.team, seed: "99" };
    expect(validateBracketPicks(roundOne, picks).length).toBeGreaterThan(0);
  });
});
