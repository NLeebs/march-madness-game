import { describe, it, expect } from "vitest";
import {
  applyPick,
  replacePlayinPlaceholder,
} from "@/src/functions/tournament/picks";
import { deepFreeze } from "./deepFreeze";
import type { Pick, TournamentPicks, TournamentPlayerPickRound } from "@/types";

type Round = 1 | 2 | "sweet sixteen" | "elite eight" | "final four" | "finals";
type PicksKey = TournamentPlayerPickRound;

const empty = () => ({ team: "", seed: "" });
const matchups = (n: number) =>
  Array.from({ length: n }, () => [empty(), empty()]);
const regions = (keys: string[], n: number) =>
  Object.fromEntries(keys.map((k) => [k, matchups(n)]));
const initialPicks = (): TournamentPicks =>
  ({
    roundTwoPicks: regions(["west", "east", "south", "midwest"], 4),
    roundSweetSixteenPicks: regions(["west", "east", "south", "midwest"], 2),
    roundEliteEightPicks: regions(["west", "east", "south", "midwest"], 1),
    roundFinalFourPicks: regions(["eastWest", "southMidwest"], 1),
    roundFinalsPicks: regions(["championship"], 1),
    champion: { champion: [[empty()]] },
  }) as TournamentPicks;

const pick = (
  picks: TournamentPicks,
  p: {
    round: Round;
    region: string;
    roundIndex: number;
    team: string;
    seed?: string;
    opponent?: string;
  }
): TournamentPicks =>
  applyPick(picks, { seed: "1", opponent: "", ...p } as Pick);

const teamsIn = (picks: TournamentPicks, key: PicksKey): string[] =>
  Object.values(picks[key]).flatMap((ms) =>
    ms.flatMap((m) => m.map((t) => t.team))
  );

describe("applyPick writes to the right slot", () => {
  const cases: {
    round: Round;
    key: PicksKey;
    region: string;
    roundIndex: number;
    row: number;
    col: number;
  }[] = [
    { round: 1, key: "roundTwoPicks", region: "west", roundIndex: 0, row: 0, col: 0 },
    { round: 1, key: "roundTwoPicks", region: "east", roundIndex: 5, row: 2, col: 1 },
    { round: 1, key: "roundTwoPicks", region: "midwest", roundIndex: 7, row: 3, col: 1 },
    { round: 2, key: "roundSweetSixteenPicks", region: "south", roundIndex: 2, row: 1, col: 0 },
    { round: "sweet sixteen", key: "roundEliteEightPicks", region: "west", roundIndex: 1, row: 0, col: 1 },
    { round: "elite eight", key: "roundFinalFourPicks", region: "eastWest", roundIndex: 0, row: 0, col: 0 },
    { round: "final four", key: "roundFinalsPicks", region: "championship", roundIndex: 1, row: 0, col: 1 },
    { round: "finals", key: "champion", region: "champion", roundIndex: 0, row: 0, col: 0 },
  ];

  it.each(cases)(
    "round $round index $roundIndex writes $key/$region row $row col $col",
    ({ round, key, region, roundIndex, row, col }) => {
      const next = pick(initialPicks(), { round, region, roundIndex, team: "Duke", seed: "4" });
      expect(next[key][region][row][col]).toEqual({ team: "Duke", seed: "4" });
      const filled = (Object.keys(next) as PicksKey[]).flatMap((k) =>
        teamsIn(next, k).filter((t) => t !== "")
      );
      expect(filled).toEqual(["Duke"]);
    }
  );

  it("writes nothing when team is empty", () => {
    const before = initialPicks();
    const next = pick(before, { round: 1, region: "west", roundIndex: 0, team: "", seed: "9" });
    expect(next).toEqual(before);
  });

  it("an empty team with an opponent still clears the opponent from later rounds", () => {
    // current behaviour: the empty-team guard only skips the write; the cascade still runs.
    let s = pick(initialPicks(), { round: 2, region: "west", roundIndex: 0, team: "Rival" });
    s = pick(s, { round: 1, region: "west", roundIndex: 0, team: "", opponent: "Rival" });
    expect(s.roundSweetSixteenPicks.west[0][0]).toEqual({ team: "", seed: "" });
    expect(s.roundTwoPicks.west[0][0]).toEqual({ team: "", seed: "" });
  });
});

describe("applyPick cascade", () => {
  it("clears the opponent from every later round in every region but not the current round", () => {
    let s = initialPicks();
    s = pick(s, { round: 1, region: "west", roundIndex: 1, team: "Rival", seed: "8" });
    s = pick(s, { round: 2, region: "west", roundIndex: 0, team: "Rival", seed: "8" });
    s = pick(s, { round: 2, region: "east", roundIndex: 3, team: "Rival", seed: "8" });
    s = pick(s, { round: "sweet sixteen", region: "south", roundIndex: 0, team: "Rival", seed: "8" });
    s = pick(s, { round: "elite eight", region: "eastWest", roundIndex: 1, team: "Rival", seed: "8" });
    s = pick(s, { round: "final four", region: "championship", roundIndex: 0, team: "Rival", seed: "8" });
    s = pick(s, { round: "finals", region: "champion", roundIndex: 0, team: "Rival", seed: "8" });

    s = pick(s, { round: 1, region: "west", roundIndex: 0, team: "Winner", seed: "1", opponent: "Rival" });

    expect(s.roundTwoPicks.west[0][0]).toEqual({ team: "Winner", seed: "1" });
    expect(s.roundTwoPicks.west[0][1]).toEqual({ team: "Rival", seed: "8" });
    expect(s.roundSweetSixteenPicks.west[0][0]).toEqual({ team: "", seed: "" });
    expect(s.roundSweetSixteenPicks.east[1][1]).toEqual({ team: "", seed: "" });
    expect(s.roundEliteEightPicks.south[0][0]).toEqual({ team: "", seed: "" });
    expect(s.roundFinalFourPicks.eastWest[0][1]).toEqual({ team: "", seed: "" });
    expect(s.roundFinalsPicks.championship[0][0]).toEqual({ team: "", seed: "" });
    expect(s.champion.champion[0][0]).toEqual({ team: "", seed: "" });
  });

  it("does not clear earlier rounds", () => {
    let s = initialPicks();
    s = pick(s, { round: 1, region: "west", roundIndex: 0, team: "Rival" });
    s = pick(s, { round: 2, region: "west", roundIndex: 0, team: "Winner", opponent: "Rival" });
    expect(s.roundTwoPicks.west[0][0].team).toBe("Rival");
  });

  it("does not clear other teams, and clears nothing when opponent is empty", () => {
    let s = initialPicks();
    s = pick(s, { round: 2, region: "west", roundIndex: 0, team: "Bystander" });
    s = pick(s, { round: 2, region: "east", roundIndex: 0, team: "Rival" });
    s = pick(s, { round: 1, region: "west", roundIndex: 0, team: "Winner", opponent: "" });
    expect(s.roundSweetSixteenPicks.west[0][0].team).toBe("Bystander");
    expect(s.roundSweetSixteenPicks.east[0][0].team).toBe("Rival");
    s = pick(s, { round: 1, region: "west", roundIndex: 1, team: "Other", opponent: "Rival" });
    expect(s.roundSweetSixteenPicks.west[0][0].team).toBe("Bystander");
    expect(s.roundSweetSixteenPicks.east[0][0].team).toBe("");
  });

  it("a finals pick has no later rounds to clear", () => {
    let s = pick(initialPicks(), { round: "final four", region: "championship", roundIndex: 0, team: "Rival" });
    s = pick(s, { round: "finals", region: "champion", roundIndex: 0, team: "Winner", opponent: "Rival" });
    expect(s.roundFinalsPicks.championship[0][0].team).toBe("Rival");
    expect(s.champion.champion[0][0].team).toBe("Winner");
  });

  it("does not mutate a frozen input", () => {
    let s = initialPicks();
    s = pick(s, { round: 2, region: "west", roundIndex: 0, team: "Rival" });
    deepFreeze(s);
    const out = pick(s, { round: 1, region: "west", roundIndex: 0, team: "W", opponent: "Rival" });
    expect(out.roundSweetSixteenPicks.west[0][0].team).toBe("");
    expect(s.roundSweetSixteenPicks.west[0][0].team).toBe("Rival");
  });
});

describe("replacePlayinPlaceholder", () => {
  const placeholders = [
    { seedType: "sixteenSeeds", gameIndex: 0, ph: "playinGameSeed16Game1" },
    { seedType: "sixteenSeeds", gameIndex: 1, ph: "playinGameSeed16Game2" },
    { seedType: "elevenSeeds", gameIndex: 0, ph: "playinGameSeed11Game1" },
    { seedType: "elevenSeeds", gameIndex: 1, ph: "playinGameSeed11Game2" },
  ] as const;

  it.each(placeholders)(
    "replaces $ph in every round picked through to champion",
    ({ seedType, gameIndex, ph }) => {
      let s = initialPicks();
      s = pick(s, { round: 1, region: "west", roundIndex: 0, team: ph });
      s = pick(s, { round: 2, region: "west", roundIndex: 0, team: ph });
      s = pick(s, { round: "sweet sixteen", region: "west", roundIndex: 0, team: ph });
      s = pick(s, { round: "elite eight", region: "eastWest", roundIndex: 0, team: ph });
      s = pick(s, { round: "final four", region: "championship", roundIndex: 0, team: ph });
      s = pick(s, { round: "finals", region: "champion", roundIndex: 0, team: ph });
      s = pick(s, { round: 1, region: "midwest", roundIndex: 3, team: ph });

      const keys = Object.keys(s) as PicksKey[];
      keys.forEach((k) => expect(teamsIn(s, k)).toContain(ph));

      s = replacePlayinPlaceholder(s, { seedType, gameIndex, winningTeam: "Winner U" });

      keys.forEach((k) => {
        expect(teamsIn(s, k)).toContain("Winner U");
        expect(teamsIn(s, k)).not.toContain(ph);
      });
      expect(s.roundTwoPicks.midwest[1][1].team).toBe("Winner U");
      expect(s.champion.champion[0][0].team).toBe("Winner U");
    }
  );

  it("leaves the other placeholders alone", () => {
    let s = pick(initialPicks(), { round: 1, region: "west", roundIndex: 0, team: "playinGameSeed16Game2" });
    s = pick(s, { round: 1, region: "west", roundIndex: 1, team: "playinGameSeed11Game1" });
    s = replacePlayinPlaceholder(s, { seedType: "sixteenSeeds", gameIndex: 0, winningTeam: "Winner U" });
    expect(s.roundTwoPicks.west[0][0].team).toBe("playinGameSeed16Game2");
    expect(s.roundTwoPicks.west[0][1].team).toBe("playinGameSeed11Game1");
  });

  it("treats any seedType other than sixteenSeeds as eleven seeds and keeps the seed", () => {
    let s = pick(initialPicks(), { round: 1, region: "west", roundIndex: 0, team: "playinGameSeed11Game2", seed: "11" });
    s = replacePlayinPlaceholder(s, { seedType: "other" as never, gameIndex: 1, winningTeam: "W" });
    expect(s.roundTwoPicks.west[0][0]).toEqual({ team: "W", seed: "11" });
  });

  it("does not mutate a frozen input", () => {
    const s = deepFreeze(
      pick(initialPicks(), { round: 1, region: "west", roundIndex: 0, team: "playinGameSeed16Game1" })
    );
    const out = replacePlayinPlaceholder(s, { seedType: "sixteenSeeds", gameIndex: 0, winningTeam: "W" });
    expect(out.roundTwoPicks.west[0][0].team).toBe("W");
    expect(s.roundTwoPicks.west[0][0].team).toBe("playinGameSeed16Game1");
  });
});

describe("Pick.round type", () => {
  it("rejects the champion round at compile time (no round follows it)", () => {
    const championPick: Pick = {
      // @ts-expect-error "champion" is not a pickable round
      round: "champion",
      region: "champion",
      roundIndex: 0,
      team: "a",
      seed: "1",
      opponent: "b",
    };
    expect(championPick.round).toBe("champion");
  });
});
