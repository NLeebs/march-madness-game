import { describe, it, expect } from "vitest";
import { tounramentPlayersPicksActions, tournamentActions } from "@/store";
// The slices are the modules' default exports (not re-exported by the barrel).
import picksSlice from "@/store/tournamentPlayersPicksSlice";
import tournamentSlice from "@/store/tournamentSlice";

type PicksState = ReturnType<typeof picksSlice.reducer>;
type PicksKey = keyof PicksState["picks"];
type TState = ReturnType<typeof tournamentSlice.reducer>;
type Round = 1 | 2 | "sweet sixteen" | "elite eight" | "final four" | "finals";
type RoundPicks = PicksState["picks"][PicksKey];

const initialPicks = (): PicksState =>
  picksSlice.reducer(undefined, { type: "@@init" });
const pick = (
  state: PicksState,
  p: {
    round: Round;
    region: string;
    roundIndex: number;
    team: string;
    seed?: string;
    opponent?: string;
  }
): PicksState =>
  picksSlice.reducer(
    state,
    tounramentPlayersPicksActions.setPick({ seed: "1", opponent: "", ...p })
  );

const teamsIn = (state: PicksState, key: PicksKey): string[] =>
  Object.values(state.picks[key]).flatMap((matchups) =>
    matchups.flatMap((m) => m.map((t) => t.team))
  );

describe("initial picks state", () => {
  it("is not in dev mode in the test environment", () => {
    expect(process.env.NEXT_PUBLIC_APP_MODE).not.toBe("dev");
  });

  it("has every pick empty and the exact round shape", () => {
    const { picks } = initialPicks();
    const shape = (key: PicksKey) =>
      Object.fromEntries(
        Object.entries(picks[key]).map(([r, ms]) => [r, ms.map((m) => m.length)])
      );
    expect(shape("roundTwoPicks")).toEqual({
      west: [2, 2, 2, 2], east: [2, 2, 2, 2], south: [2, 2, 2, 2], midwest: [2, 2, 2, 2],
    });
    expect(shape("roundSweetSixteenPicks")).toEqual({
      west: [2, 2], east: [2, 2], south: [2, 2], midwest: [2, 2],
    });
    expect(shape("roundEliteEightPicks")).toEqual({
      west: [2], east: [2], south: [2], midwest: [2],
    });
    expect(shape("roundFinalFourPicks")).toEqual({ eastWest: [2], southMidwest: [2] });
    expect(shape("roundFinalsPicks")).toEqual({ championship: [2] });
    expect(shape("champion")).toEqual({ champion: [1] });
    (Object.keys(picks) as PicksKey[]).forEach((key) => {
      Object.values(picks[key]).forEach((matchups) =>
        matchups.forEach((m) =>
          m.forEach((t) => expect(t).toEqual({ team: "", seed: "" }))
        )
      );
    });
  });
});

describe("setPick writes to the right slot", () => {
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
      expect(next.picks[key][region][row][col]).toEqual({ team: "Duke", seed: "4" });
      // exactly one slot in the whole state is non-empty
      const filled = (Object.keys(next.picks) as PicksKey[]).flatMap((k) =>
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
    expect(s.picks.roundSweetSixteenPicks.west[0][0]).toEqual({ team: "", seed: "" });
    expect(s.picks.roundTwoPicks.west[0][0]).toEqual({ team: "", seed: "" });
  });
});

describe("setPick cascade", () => {
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

    expect(s.picks.roundTwoPicks.west[0][0]).toEqual({ team: "Winner", seed: "1" });
    // current round untouched: the opponent's own round-1 slot keeps the name
    expect(s.picks.roundTwoPicks.west[0][1]).toEqual({ team: "Rival", seed: "8" });
    expect(s.picks.roundSweetSixteenPicks.west[0][0]).toEqual({ team: "", seed: "" });
    expect(s.picks.roundSweetSixteenPicks.east[1][1]).toEqual({ team: "", seed: "" });
    expect(s.picks.roundEliteEightPicks.south[0][0]).toEqual({ team: "", seed: "" });
    expect(s.picks.roundFinalFourPicks.eastWest[0][1]).toEqual({ team: "", seed: "" });
    expect(s.picks.roundFinalsPicks.championship[0][0]).toEqual({ team: "", seed: "" });
    expect(s.picks.champion.champion[0][0]).toEqual({ team: "", seed: "" });
  });

  it("does not clear earlier rounds", () => {
    let s = initialPicks();
    s = pick(s, { round: 1, region: "west", roundIndex: 0, team: "Rival" });
    s = pick(s, { round: 2, region: "west", roundIndex: 0, team: "Winner", opponent: "Rival" });
    expect(s.picks.roundTwoPicks.west[0][0].team).toBe("Rival");
  });

  it("does not clear other teams, and clears nothing when opponent is empty", () => {
    let s = initialPicks();
    s = pick(s, { round: 2, region: "west", roundIndex: 0, team: "Bystander" });
    s = pick(s, { round: 2, region: "east", roundIndex: 0, team: "Rival" });
    s = pick(s, { round: 1, region: "west", roundIndex: 0, team: "Winner", opponent: "" });
    expect(s.picks.roundSweetSixteenPicks.west[0][0].team).toBe("Bystander");
    expect(s.picks.roundSweetSixteenPicks.east[0][0].team).toBe("Rival");
    s = pick(s, { round: 1, region: "west", roundIndex: 1, team: "Other", opponent: "Rival" });
    expect(s.picks.roundSweetSixteenPicks.west[0][0].team).toBe("Bystander");
    expect(s.picks.roundSweetSixteenPicks.east[0][0].team).toBe("");
  });

  it("a finals pick has no later rounds to clear", () => {
    let s = pick(initialPicks(), { round: "final four", region: "championship", roundIndex: 0, team: "Rival" });
    s = pick(s, { round: "finals", region: "champion", roundIndex: 0, team: "Winner", opponent: "Rival" });
    expect(s.picks.roundFinalsPicks.championship[0][0].team).toBe("Rival");
    expect(s.picks.champion.champion[0][0].team).toBe("Winner");
  });
});

describe("replacePlayinPicksWithWinner", () => {
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
      // also in another region, same round
      s = pick(s, { round: 1, region: "midwest", roundIndex: 3, team: ph });

      const keys = Object.keys(s.picks) as PicksKey[];
      keys.forEach((k) => expect(teamsIn(s, k)).toContain(ph));

      s = picksSlice.reducer(
        s,
        tounramentPlayersPicksActions.replacePlayinPicksWithWinner({
          seedType,
          gameIndex,
          winningTeam: "Winner U",
        })
      );

      keys.forEach((k) => {
        expect(teamsIn(s, k)).toContain("Winner U");
        expect(teamsIn(s, k)).not.toContain(ph);
      });
      expect(s.picks.roundTwoPicks.midwest[1][1].team).toBe("Winner U");
      expect(s.picks.champion.champion[0][0].team).toBe("Winner U");
    }
  );

  it("leaves the other placeholders alone", () => {
    let s = pick(initialPicks(), { round: 1, region: "west", roundIndex: 0, team: "playinGameSeed16Game2" });
    s = pick(s, { round: 1, region: "west", roundIndex: 1, team: "playinGameSeed11Game1" });
    s = picksSlice.reducer(
      s,
      tounramentPlayersPicksActions.replacePlayinPicksWithWinner({
        seedType: "sixteenSeeds",
        gameIndex: 0,
        winningTeam: "Winner U",
      })
    );
    expect(s.picks.roundTwoPicks.west[0][0].team).toBe("playinGameSeed16Game2");
    expect(s.picks.roundTwoPicks.west[0][1].team).toBe("playinGameSeed11Game1");
  });
});

describe("comparePicksAndGames", () => {
  type Slot = { team: string; seed: string };
  const selectedOf = (t: unknown) => (t as { selected?: boolean }).selected;
  const slot = (team: string): Slot => ({ team, seed: "1" });
  const emptyTournament = (): TState =>
    tournamentSlice.reducer(undefined, { type: "@@init" });
  const compare = (
    state: TState,
    round: Round,
    winningTeams: string[],
    picks: Record<string, unknown>
  ): TState =>
    tournamentSlice.reducer(
      state,
      tournamentActions.comparePicksAndGames({ round, winningTeams, picks })
    );
  // picks for one region: list of matchups, each a list of team names.
  const picksOf = (matchups: string[][]) =>
    matchups.map((m) => m.map((team) => ({ team, seed: "1" })));

  const scenarios: {
    round: Round;
    points: number;
    stateKey: "roundTwoMatchups" | "roundSweetSixteenMatchups" | "roundEliteEightMatchups" | "roundFinalFourMatchups" | "roundFinalsMatchups";
    region: string;
    matchupCount: number;
  }[] = [
    { round: 1, points: 10, stateKey: "roundTwoMatchups", region: "west", matchupCount: 4 },
    { round: 2, points: 20, stateKey: "roundSweetSixteenMatchups", region: "west", matchupCount: 2 },
    { round: "sweet sixteen", points: 40, stateKey: "roundEliteEightMatchups", region: "west", matchupCount: 1 },
    { round: "elite eight", points: 80, stateKey: "roundFinalFourMatchups", region: "eastWest", matchupCount: 1 },
    { round: "final four", points: 160, stateKey: "roundFinalsMatchups", region: "championship", matchupCount: 1 },
  ];

  it.each(scenarios)(
    "awards $points per correct pick for round $round and marks only those selected",
    ({ round, points, stateKey, region, matchupCount }) => {
      const base = emptyTournament();
      const indexes = Array.from({ length: matchupCount }, (_, i) => i);
      const state = {
        ...base,
        [stateKey]: {
          ...base[stateKey],
          [region]: indexes.map((i) => [slot(`A${i}`), slot(`B${i}`)]),
        },
      } as TState;
      // Player picks the same team the games produced everywhere except slot [last][1].
      const last = matchupCount - 1;
      const picks = {
        [region]: picksOf(
          indexes.map((i) => [`A${i}`, i === last ? `WRONG${i}` : `B${i}`])
        ),
      };
      const winningTeams = indexes.flatMap((i) => [`A${i}`, `B${i}`]);
      const next = compare(state, round, winningTeams, picks);
      const out = next[stateKey][region];
      indexes.forEach((i) => {
        expect(selectedOf(out[i][0]), `[${i}][0]`).toBe(true);
        expect(selectedOf(out[i][1]), `[${i}][1]`).toBe(i !== last);
      });
      expect(next.playerScore).toBe((2 * matchupCount - 1) * points);
    }
  );

  it("awards 320 for the finals pick and marks the champion selected", () => {
    const state = { ...emptyTournament(), champion: { champion: [[slot("A")]] } } as TState;
    const next = compare(state, "finals", ["A"], { champion: picksOf([["A"]]) });
    expect(selectedOf(next.champion.champion[0][0])).toBe(true);
    expect(next.playerScore).toBe(320);
  });

  it("marks a wrong pick selected=false and scores nothing", () => {
    const state = { ...emptyTournament(), champion: { champion: [[slot("A")]] } } as TState;
    const next = compare(state, "finals", ["A"], { champion: picksOf([["B"]]) });
    expect(selectedOf(next.champion.champion[0][0])).toBe(false);
    expect(next.playerScore).toBe(0);
  });

  it("walks the next round's matchups, so slots not yet filled there are never scored", () => {
    // current behaviour: initial next-round matchups are empty arrays, so nothing is
    // scored even when every pick would be right.
    const next = compare(emptyTournament(), 1, ["A", "B"], {
      west: picksOf([["A", "B"], ["A", "B"], ["A", "B"], ["A", "B"]]),
    });
    expect(next.playerScore).toBe(0);
  });

  it("accumulates playerScore across rounds", () => {
    const base = emptyTournament();
    let state = {
      ...base,
      roundTwoMatchups: { ...base.roundTwoMatchups, west: [[slot("A"), slot("B")], [], [], []] },
      roundSweetSixteenMatchups: { ...base.roundSweetSixteenMatchups, west: [[slot("A"), slot("C")], []] },
      champion: { champion: [[slot("A")]] },
    } as TState;
    state = compare(state, 1, ["A", "B"], { west: picksOf([["A", "B"]]) });
    expect(state.playerScore).toBe(20);
    state = compare(state, 2, ["A"], { west: picksOf([["A", "X"]]) });
    expect(state.playerScore).toBe(40);
    state = compare(state, "finals", ["A"], { champion: picksOf([["A"]]) });
    expect(state.playerScore).toBe(360);
  });
});
