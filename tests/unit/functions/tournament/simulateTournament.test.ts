import { describe, it, expect } from "vitest";
import {
  simulateTournament,
  type TournamentField,
} from "@/src/functions/tournament/simulateTournament";
import { emptyPicks } from "@/src/functions/tournament/emptyState";
import { applyPick } from "@/src/functions/tournament/picks";
import { buildRoundOneMatchups } from "@/src/functions/tournament/buildRoundOneMatchups";
import { seedTournament } from "@/src/functions/tournament/seedTournament";
import {
  ALL_PLAYIN_PLACEHOLDERS,
  ROUND_CONFIG,
  SCORED_ROUNDS,
  nextRegionOf,
} from "@/src/functions/tournament/roundConfig";
import {
  ROUND_POINTS,
  scoreRound,
  type RoundPoints,
} from "@/src/functions/tournament/scoreRound";
import { GameDataError } from "@/src/functions/generic/GameDataError";
import { buildLeague } from "@/tests/factories";
import { mulberry32 } from "@/tests/game/helpers/mulberry32";
import { deepFreeze } from "./deepFreeze";
import type {
  ScoredRound,
  TournamentPicks,
  TournamentRegion,
  TournamentRoundMatchups,
} from "@/types";

type Slot = { team: string; seed: string | number };

const league = buildLeague();
const teamNames = Object.values(league.teamStats).flatMap((conf) =>
  Object.keys(conf)
);
const buildField = (): TournamentField => ({
  tournamentTeams: teamNames.slice(0, 60),
  playinTeams: {
    elevenSeeds: teamNames.slice(60, 64),
    sixteenSeeds: teamNames.slice(64, 68),
  },
});

/** Picks the better seed (team index 0 on a tie) in every game, like pickChalk in tests/game/helpers/runGame.ts. */
function chalkPicks(roundOne: TournamentRoundMatchups): TournamentPicks {
  let picks = emptyPicks();
  SCORED_ROUNDS.forEach((round, r) => {
    const source = (
      r === 0 ? roundOne : picks[ROUND_CONFIG[SCORED_ROUNDS[r - 1]].nextPicksKey]
    ) as unknown as Record<TournamentRegion | "playin", Slot[][]>;
    (Object.keys(source) as (TournamentRegion | "playin")[]).forEach(
      (region) => {
        if (region === "playin") return;
        source[region].forEach((matchup, index) => {
          const better =
            Number(matchup[1].seed) < Number(matchup[0].seed) ? 1 : 0;
          picks = applyPick(picks, {
            round,
            region: nextRegionOf(round, region),
            roundIndex: ROUND_CONFIG[round].advance[region]?.teamIndex ?? index,
            team: matchup[better].team,
            seed: String(matchup[better].seed),
            opponent: matchup[1 - better].team,
          });
        });
      }
    );
  });
  return picks;
}

const buildInput = (points: RoundPoints = ROUND_POINTS) => {
  const field = buildField();
  const roundOne = buildRoundOneMatchups(
    seedTournament(field.tournamentTeams),
    field.playinTeams
  );
  return {
    field,
    picks: chalkPicks(roundOne),
    teamStats: league.teamStats,
    points,
    rng: mulberry32(7),
  };
};

const GAMES_PER_ROUND: Record<ScoredRound, number> = {
  1: 32,
  2: 16,
  "sweet sixteen": 8,
  "elite eight": 4,
  "final four": 2,
  finals: 1,
};

describe("simulateTournament", () => {
  it("plays 4 play-in games and 32/16/8/4/2/1 games per round", () => {
    const result = simulateTournament(buildInput());
    expect(result.playin).toHaveLength(4);
    SCORED_ROUNDS.forEach((round) =>
      expect(result.rounds[round]).toHaveLength(GAMES_PER_ROUND[round])
    );
  });

  it("every play-in result has both scores and the winner has the higher score", () => {
    const { playin } = simulateTournament(buildInput());
    playin.forEach((game) => {
      expect(game.winningScore).toBeTypeOf("number");
      expect(game.losingScore).toBeTypeOf("number");
      expect(game.winningScore!).toBeGreaterThan(game.losingScore!);
    });
  });

  it("the champion is the finals winner", () => {
    const { bracket, rounds } = simulateTournament(buildInput());
    expect(bracket.champion.champion![0][0].team).toBe(
      rounds.finals[0].winningTeam
    );
  });

  it("no placeholder remains in returned picks", () => {
    const { picks } = simulateTournament(buildInput());
    Object.values(picks).forEach((round) =>
      Object.values(round).forEach((games) =>
        games.forEach((game) =>
          game.forEach((slot) =>
            expect(ALL_PLAYIN_PLACEHOLDERS).not.toContain(slot.team)
          )
        )
      )
    );
  });

  it("score is the sum of roundPoints and matches scoreRound per round", () => {
    const result = simulateTournament(buildInput());
    let total = 0;
    SCORED_ROUNDS.forEach((round) => {
      const key = ROUND_CONFIG[round].nextPicksKey;
      const { points } = scoreRound({
        round,
        advanced: result.picks[key],
        picks: result.picks[key],
        winningTeams: result.rounds[round].map((g) => g.winningTeam),
        points: ROUND_POINTS,
      });
      expect(result.roundPoints[round]).toBe(points);
      total += points;
    });
    expect(result.score).toBe(total);
  });

  it("uses the injected points table", () => {
    const ones: RoundPoints = {
      1: 1,
      2: 1,
      "sweet sixteen": 1,
      "elite eight": 1,
      "final four": 1,
      finals: 1,
    };
    const result = simulateTournament(buildInput(ones));
    let correct = 0;
    SCORED_ROUNDS.forEach((round) => {
      const winners = result.rounds[round].map((g) => g.winningTeam);
      const key = ROUND_CONFIG[round].nextPicksKey;
      Object.values(result.picks[key]).forEach((games) =>
        games.forEach((game) =>
          game.forEach((slot) => {
            if (winners.includes(slot.team)) correct++;
          })
        )
      );
    });
    expect(result.score).toBe(correct);
    expect(correct).toBeGreaterThan(0);
  });

  it("same seed gives the same result", () => {
    const a = simulateTournament({ ...buildInput(), rng: mulberry32(7) });
    const b = simulateTournament({ ...buildInput(), rng: mulberry32(7) });
    expect(a).toEqual(b);
  });

  it("does not mutate inputs", () => {
    const input = buildInput();
    deepFreeze(input.field);
    deepFreeze(input.picks);
    deepFreeze(input.teamStats);
    expect(() => simulateTournament(input)).not.toThrow();
  });

  it("throws GameDataError for a field team with no stats", () => {
    const input = buildInput();
    input.field = {
      ...input.field,
      tournamentTeams: ["No Such Team", ...input.field.tournamentTeams.slice(1)],
    };
    expect(() => simulateTournament(input)).toThrow(GameDataError);
  });
});
