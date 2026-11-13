import { describe, it, expect } from "vitest";
import { tournamentActions } from "@/store";
// The slice itself is the module's default export (not re-exported by the barrel).
import tournamentSlice from "@/store/tournamentSlice";
import type { PlayinSeedType, TournamentGameResult } from "@/types";

type State = ReturnType<typeof tournamentSlice.reducer>;
type Action = Parameters<typeof tournamentSlice.reducer>[1];
type Round = 1 | 2 | "sweet sixteen" | "elite eight" | "final four" | "finals";
type Slot = { team: string; seed: number };

const REGIONS = ["west", "east", "south", "midwest"] as const;
const pad = (n: number) => String(n).padStart(2, "0");
const SIXTY = Array.from({ length: 60 }, (_, i) => `s${pad(i + 1)}`);

const initial = (): State =>
  tournamentSlice.reducer(undefined, { type: "@@init" });
const reduce = (state: State, action: Action): State =>
  tournamentSlice.reducer(state, action);

const PLAYIN_11 = ["p11a", "p11b", "p11c", "p11d"];
const PLAYIN_16 = ["p16a", "p16b", "p16c", "p16d"];

const seeded = (): State => {
  let s = reduce(initial(), tournamentActions.addTournamentTeams(SIXTY));
  s = reduce(s, tournamentActions.setTournamentSeeds());
  PLAYIN_11.forEach((team) => {
    s = reduce(s, tournamentActions.setPlayinTeams({ team, seed: 11 }));
  });
  PLAYIN_16.forEach((team) => {
    s = reduce(s, tournamentActions.setPlayinTeams({ team, seed: 16 }));
  });
  return s;
};
const withMatchups = (): State =>
  reduce(seeded(), tournamentActions.setRoundOneMatchups());

const m = (a: string, sa: number, b: string, sb: number): Slot[] => [
  { team: a, seed: sa },
  { team: b, seed: sb },
];

describe("setTournamentSeeds", () => {
  const s = seeded();

  it("builds the exact west array", () => {
    expect(s.tournamentSeeds.west).toEqual([
      "s01", "s08", "s09", "s16", "s17", "s24", "s25", "s32",
      "s33", "s40", "s41", "s46", "s47", "s54", "s55", "playinGameSeed16Game1",
    ]);
  });

  it("builds the exact east array", () => {
    expect(s.tournamentSeeds.east).toEqual([
      "s02", "s07", "s10", "s15", "s18", "s23", "s26", "s31",
      "s34", "s39", "s42", "s45", "s48", "s53", "s56", "playinGameSeed16Game2",
    ]);
  });

  it("builds the exact south array with the 11 play-in at index 10", () => {
    expect(s.tournamentSeeds.south).toEqual([
      "s03", "s06", "s11", "s14", "s19", "s22", "s27", "s30",
      "s35", "s38", "playinGameSeed11Game1", "s44", "s49", "s52", "s57", "s60",
    ]);
  });

  it("builds the exact midwest array with the 11 play-in at index 10", () => {
    expect(s.tournamentSeeds.midwest).toEqual([
      "s04", "s05", "s12", "s13", "s20", "s21", "s28", "s29",
      "s36", "s37", "playinGameSeed11Game2", "s43", "s50", "s51", "s58", "s59",
    ]);
  });

  it("has 16 entries per region and uses every team exactly once", () => {
    REGIONS.forEach((r) => expect(s.tournamentSeeds[r]).toHaveLength(16));
    const all = REGIONS.flatMap((r) => s.tournamentSeeds[r]);
    const placeholders = all.filter((t) => t.startsWith("playinGame"));
    expect([...placeholders].sort()).toEqual([
      "playinGameSeed11Game1", "playinGameSeed11Game2",
      "playinGameSeed16Game1", "playinGameSeed16Game2",
    ]);
    const real = all.filter((t) => !t.startsWith("playinGame"));
    expect([...real].sort()).toEqual(SIXTY);
    expect(new Set(all).size).toBe(64);
  });
});

describe("setRoundOneMatchups", () => {
  const s = withMatchups();

  it("orders west as 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15", () => {
    expect(s.roundOneMatchups.west).toEqual([
      m("s01", 1, "playinGameSeed16Game1", 16),
      m("s32", 8, "s33", 9),
      m("s17", 5, "s46", 12),
      m("s16", 4, "s47", 13),
      m("s24", 6, "s41", 11),
      m("s09", 3, "s54", 14),
      m("s25", 7, "s40", 10),
      m("s08", 2, "s55", 15),
    ]);
  });

  it("orders east", () => {
    expect(s.roundOneMatchups.east).toEqual([
      m("s02", 1, "playinGameSeed16Game2", 16),
      m("s31", 8, "s34", 9),
      m("s18", 5, "s45", 12),
      m("s15", 4, "s48", 13),
      m("s23", 6, "s42", 11),
      m("s10", 3, "s53", 14),
      m("s26", 7, "s39", 10),
      m("s07", 2, "s56", 15),
    ]);
  });

  it("orders south (11 play-in placeholder in the 6v11 game)", () => {
    expect(s.roundOneMatchups.south).toEqual([
      m("s03", 1, "s60", 16),
      m("s30", 8, "s35", 9),
      m("s19", 5, "s44", 12),
      m("s14", 4, "s49", 13),
      m("s22", 6, "playinGameSeed11Game1", 11),
      m("s11", 3, "s52", 14),
      m("s27", 7, "s38", 10),
      m("s06", 2, "s57", 15),
    ]);
  });

  it("orders midwest (11 play-in placeholder in the 6v11 game)", () => {
    expect(s.roundOneMatchups.midwest).toEqual([
      m("s04", 1, "s59", 16),
      m("s29", 8, "s36", 9),
      m("s20", 5, "s43", 12),
      m("s13", 4, "s50", 13),
      m("s21", 6, "playinGameSeed11Game2", 11),
      m("s12", 3, "s51", 14),
      m("s28", 7, "s37", 10),
      m("s05", 2, "s58", 15),
    ]);
  });

  it("pairs play-in teams [0] v [3] and [1] v [2] with seed 11 / 16", () => {
    expect(s.roundOneMatchups.playin.elevenSeeds).toEqual([
      m("p11a", 11, "p11d", 11),
      m("p11b", 11, "p11c", 11),
    ]);
    expect(s.roundOneMatchups.playin.sixteenSeeds).toEqual([
      m("p16a", 16, "p16d", 16),
      m("p16b", 16, "p16c", 16),
    ]);
  });
});

describe("setPlayinGameResults", () => {
  const play = (seedType: string, gameIndex: number, winningTeam: string) =>
    reduce(
      withMatchups(),
      tournamentActions.setPlayinGameResults({
        seedType: seedType as PlayinSeedType,
        gameIndex,
        winningTeam,
        winningScore: 70,
        losingScore: 65,
      })
    );

  it("eleven game 0 winner replaces south[4][1].team", () => {
    const s = play("elevenSeeds", 0, "p11d");
    expect(s.roundOneMatchups.south[4][1]).toEqual({ team: "p11d", seed: 11 });
    expect(s.roundOneMatchups.midwest[4][1].team).toBe("playinGameSeed11Game2");
    expect(s.roundOneMatchups.playin.elevenSeeds[0]).toEqual([
      { team: "p11a", seed: 11, score: 65, win: false },
      { team: "p11d", seed: 11, score: 70, win: true },
    ]);
    expect(s.roundOneMatchups.playin.elevenSeeds[1]).toEqual(
      m("p11b", 11, "p11c", 11)
    );
  });

  it("eleven game 1 winner replaces midwest[4][1].team", () => {
    const s = play("elevenSeeds", 1, "p11b");
    expect(s.roundOneMatchups.midwest[4][1]).toEqual({ team: "p11b", seed: 11 });
    expect(s.roundOneMatchups.south[4][1].team).toBe("playinGameSeed11Game1");
    expect(s.roundOneMatchups.playin.elevenSeeds[1]).toEqual([
      { team: "p11b", seed: 11, score: 70, win: true },
      { team: "p11c", seed: 11, score: 65, win: false },
    ]);
  });

  it("sixteen game 0 winner replaces west[0][1].team", () => {
    const s = play("sixteenSeeds", 0, "p16a");
    expect(s.roundOneMatchups.west[0][1]).toEqual({ team: "p16a", seed: 16 });
    expect(s.roundOneMatchups.east[0][1].team).toBe("playinGameSeed16Game2");
    expect(s.roundOneMatchups.playin.sixteenSeeds[0]).toEqual([
      { team: "p16a", seed: 16, score: 70, win: true },
      { team: "p16d", seed: 16, score: 65, win: false },
    ]);
  });

  it("sixteen game 1 winner replaces east[0][1].team", () => {
    const s = play("sixteenSeeds", 1, "p16c");
    expect(s.roundOneMatchups.east[0][1]).toEqual({ team: "p16c", seed: 16 });
    expect(s.roundOneMatchups.west[0][1].team).toBe("playinGameSeed16Game1");
    expect(s.roundOneMatchups.playin.sixteenSeeds[1]).toEqual([
      { team: "p16b", seed: 16, score: 65, win: false },
      { team: "p16c", seed: 16, score: 70, win: true },
    ]);
  });
});

describe("setTournamentGameResults", () => {
  const win = (
    s: State,
    round: Round,
    region: string,
    gameIndex: number,
    winningTeam: string,
    seed: number,
    winningScore = 80,
    losingScore = 60
  ): State =>
    reduce(
      s,
      tournamentActions.setTournamentGameResults({
        round,
        results: {
          region,
          gameIndex,
          winningTeam,
          winningScore,
          losingScore,
          seed,
        } as unknown as TournamentGameResult,
      })
    );

  // Plays every game of a round in the given regions; the top-listed team wins.
  const playRound = (
    s: State,
    round: Round,
    key: keyof State,
    regions: string[]
  ): State => {
    let next = s;
    regions.forEach((region) => {
      (s[key] as unknown as Record<string, Slot[][]>)[region].forEach(
        (matchup, i) => {
          next = win(next, round, region, i, matchup[0].team, matchup[0].seed);
        }
      );
    });
    return next;
  };

  it("round 1: pushes winner into round two at floor(gameIndex/2) and sets scores/win", () => {
    let s = withMatchups();
    s = win(s, 1, "west", 0, "s01", 1, 90, 50);
    s = win(s, 1, "west", 1, "s33", 9, 71, 70);
    s = win(s, 1, "west", 5, "s54", 14, 60, 59);
    expect(s.roundTwoMatchups.west).toEqual([
      [{ team: "s01", seed: 1 }, { team: "s33", seed: 9 }],
      [],
      [{ team: "s54", seed: 14 }],
      [],
    ]);
    expect(s.roundOneMatchups.west[0]).toEqual([
      { team: "s01", seed: 1, score: 90, win: true },
      { team: "playinGameSeed16Game1", seed: 16, score: 50, win: false },
    ]);
    expect(s.roundOneMatchups.west[1]).toEqual([
      { team: "s32", seed: 8, score: 70, win: false },
      { team: "s33", seed: 9, score: 71, win: true },
    ]);
    expect(s.roundOneMatchups.west[5]).toEqual([
      { team: "s09", seed: 3, score: 59, win: false },
      { team: "s54", seed: 14, score: 60, win: true },
    ]);
    // an untouched game keeps no score
    expect(s.roundOneMatchups.west[2]).toEqual(m("s17", 5, "s46", 12));
  });

  it("plays a full bracket with top-listed teams winning, through every round key", () => {
    let s = withMatchups();
    s = playRound(s, 1, "roundOneMatchups", [...REGIONS]);
    expect(s.roundTwoMatchups.west).toEqual([
      [{ team: "s01", seed: 1 }, { team: "s32", seed: 8 }],
      [{ team: "s17", seed: 5 }, { team: "s16", seed: 4 }],
      [{ team: "s24", seed: 6 }, { team: "s09", seed: 3 }],
      [{ team: "s25", seed: 7 }, { team: "s08", seed: 2 }],
    ]);

    s = playRound(s, 2, "roundTwoMatchups", [...REGIONS]);
    expect(s.roundSweetSixteenMatchups.west).toEqual([
      [{ team: "s01", seed: 1 }, { team: "s17", seed: 5 }],
      [{ team: "s24", seed: 6 }, { team: "s25", seed: 7 }],
    ]);
    expect(s.roundTwoMatchups.west[0]).toEqual([
      { team: "s01", seed: 1, score: 80, win: true },
      { team: "s32", seed: 8, score: 60, win: false },
    ]);

    s = playRound(s, "sweet sixteen", "roundSweetSixteenMatchups", [...REGIONS]);
    expect(s.roundEliteEightMatchups.west).toEqual([
      [{ team: "s01", seed: 1 }, { team: "s24", seed: 6 }],
    ]);
    expect(s.roundEliteEightMatchups.east).toEqual([
      [{ team: "s02", seed: 1 }, { team: "s23", seed: 6 }],
    ]);

    s = playRound(s, "elite eight", "roundEliteEightMatchups", [...REGIONS]);
    // east/west -> eastWest (west dispatched first), south/midwest -> southMidwest
    expect(s.roundFinalFourMatchups.eastWest).toEqual([
      [{ team: "s01", seed: 1 }, { team: "s02", seed: 1 }],
    ]);
    expect(s.roundFinalFourMatchups.southMidwest).toEqual([
      [{ team: "s03", seed: 1 }, { team: "s04", seed: 1 }],
    ]);
    expect(s.roundEliteEightMatchups.west[0]).toEqual([
      { team: "s01", seed: 1, score: 80, win: true },
      { team: "s24", seed: 6, score: 60, win: false },
    ]);

    s = playRound(s, "final four", "roundFinalFourMatchups", [
      "eastWest",
      "southMidwest",
    ]);
    expect(s.roundFinalsMatchups.championship).toEqual([
      [{ team: "s01", seed: 1 }, { team: "s03", seed: 1 }],
    ]);
    expect(s.roundFinalFourMatchups.southMidwest[0]).toEqual([
      { team: "s03", seed: 1, score: 80, win: true },
      { team: "s04", seed: 1, score: 60, win: false },
    ]);

    s = playRound(s, "finals", "roundFinalsMatchups", ["championship"]);
    expect(s.champion.champion[0]).toEqual([{ team: "s01", seed: 1 }]);
    expect(s.roundFinalsMatchups.championship[0]).toEqual([
      { team: "s01", seed: 1, score: 80, win: true },
      { team: "s03", seed: 1, score: 60, win: false },
    ]);
  });

  it("routes south/midwest elite eight winners to southMidwest and east/west to eastWest", () => {
    let s = withMatchups();
    s = playRound(s, 1, "roundOneMatchups", [...REGIONS]);
    s = playRound(s, 2, "roundTwoMatchups", [...REGIONS]);
    s = playRound(s, "sweet sixteen", "roundSweetSixteenMatchups", [...REGIONS]);
    s = win(s, "elite eight", "midwest", 0, "s21", 6);
    expect(s.roundFinalFourMatchups.southMidwest).toEqual([
      [{ team: "s21", seed: 6 }],
    ]);
    expect(s.roundFinalFourMatchups.eastWest).toEqual([[]]);
    s = win(s, "elite eight", "east", 0, "s23", 6);
    expect(s.roundFinalFourMatchups.eastWest).toEqual([
      [{ team: "s23", seed: 6 }],
    ]);
    expect(s.roundFinalFourMatchups.southMidwest).toEqual([
      [{ team: "s21", seed: 6 }],
    ]);
  });
});
