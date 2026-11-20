import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  playTournament,
  type PlayTournamentDto,
} from "@/application/useCases";
import { ValidationError } from "@/utils/errorHandling";
import { signFieldToken, FIELD_TOKEN_INVALID } from "@/utils/api/fieldToken";
import type { TournamentField } from "@/src/functions/tournament/simulateTournament";
import { buildRoundOneMatchups } from "@/src/functions/tournament/buildRoundOneMatchups";
import { seedTournament } from "@/src/functions/tournament/seedTournament";
import { ROUND_POINTS } from "@/src/functions/tournament/scoreRound";
import { validateBracketPicks } from "@/src/functions/tournament/validateBracketPicks";
import { buildLeague, chalkPicks } from "@/tests/factories";
import type { ConferenceMap } from "@/models";
import type { PersistBracketPayload } from "@/models/appStatsData";
import type { TournamentPicks } from "@/types";

const mocks = vi.hoisted(() => ({
  getTeamStatisticsByYearId: vi.fn(),
  getTeamsByYearId: vi.fn(),
  getRounds: vi.fn(),
  getRoundPoints: vi.fn(),
  findBracketScoringRulesByYearId: vi.fn(),
  persistBracket: vi.fn(),
}));

vi.mock("@/infrastructure/db/TournamentRepository", () => ({
  TournamentRepository: vi.fn().mockImplementation(() => ({
    getTeamsByYearId: mocks.getTeamsByYearId,
    getRounds: mocks.getRounds,
    getRoundPoints: mocks.getRoundPoints,
    findBracketScoringRulesByYearId: mocks.findBracketScoringRulesByYearId,
    persistBracket: mocks.persistBracket,
  })),
}));

vi.mock("@/application/useCases/team/GetTeamStatisticsByYearId", () => ({
  getTeamStatisticsByYearId: mocks.getTeamStatisticsByYearId,
}));

const YEAR_ID = "123e4567-e89b-42d3-a456-426614174000";
const RULES_ID = "rules-uuid";

const league = buildLeague();
const teamNames = Object.values(league.teamStats).flatMap((conf) =>
  Object.keys(conf)
);

const field: TournamentField = {
  tournamentTeams: teamNames.slice(0, 60),
  playinTeams: {
    elevenSeeds: teamNames.slice(60, 64),
    sixteenSeeds: teamNames.slice(64, 68),
  },
};
const fieldTeams = [
  ...field.tournamentTeams,
  ...field.playinTeams.elevenSeeds,
  ...field.playinTeams.sixteenSeeds,
];
const roundOne = buildRoundOneMatchups(
  seedTournament(field.tournamentTeams),
  field.playinTeams
);

const teams = teamNames.map((name) => ({ id: `${name}-uuid`, name }));
const rounds = [
  { id: "r1-uuid", round_name: "1" },
  { id: "r2-uuid", round_name: "2" },
  { id: "s16-uuid", round_name: "sweet sixteen" },
  { id: "e8-uuid", round_name: "elite eight" },
  { id: "f4-uuid", round_name: "final four" },
  { id: "fin-uuid", round_name: "finals" },
  { id: "champ-uuid", round_name: "champion" },
];
const rules = {
  id: RULES_ID,
  year_id: YEAR_ID,
  created_at: null,
  description: null,
  updated_at: "2026-01-01T00:00:00Z",
  version: "1",
};

function buildDto(overrides: Partial<PlayTournamentDto> = {}): PlayTournamentDto {
  return {
    fieldToken: signFieldToken({ yearId: YEAR_ID, field }),
    picks: chalkPicks(roundOne),
    userId: null,
    anonUserId: "anon-uuid",
    ...overrides,
  };
}

const savedPayload = (): PersistBracketPayload =>
  mocks.persistBracket.mock.calls[0][0];

/** A promise whose resolution the test controls. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("playTournament", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTeamStatisticsByYearId.mockResolvedValue(league.teamStats);
    mocks.getTeamsByYearId.mockResolvedValue(teams);
    mocks.getRounds.mockResolvedValue(rounds);
    mocks.getRoundPoints.mockResolvedValue(ROUND_POINTS);
    mocks.findBracketScoringRulesByYearId.mockResolvedValue(rules);
    mocks.persistBracket.mockResolvedValue("bracket-uuid");
  });

  it("loads stats, teams, rounds, points and scoring rules in parallel", async () => {
    const stats = deferred<ConferenceMap>();
    const teamsLoad = deferred<typeof teams>();
    const roundsLoad = deferred<typeof rounds>();
    const points = deferred<typeof ROUND_POINTS>();
    const rulesLoad = deferred<typeof rules>();
    mocks.getTeamStatisticsByYearId.mockReturnValue(stats.promise);
    mocks.getTeamsByYearId.mockReturnValue(teamsLoad.promise);
    mocks.getRounds.mockReturnValue(roundsLoad.promise);
    mocks.getRoundPoints.mockReturnValue(points.promise);
    mocks.findBracketScoringRulesByYearId.mockReturnValue(rulesLoad.promise);

    const pending = playTournament(buildDto());
    await Promise.resolve();

    expect(mocks.getTeamStatisticsByYearId).toHaveBeenCalledWith(YEAR_ID);
    expect(mocks.getTeamsByYearId).toHaveBeenCalledWith(YEAR_ID);
    expect(mocks.getRounds).toHaveBeenCalledTimes(1);
    expect(mocks.getRoundPoints).toHaveBeenCalledTimes(1);
    expect(mocks.findBracketScoringRulesByYearId).toHaveBeenCalledWith(YEAR_ID);
    expect(mocks.persistBracket).not.toHaveBeenCalled();

    stats.resolve(league.teamStats);
    teamsLoad.resolve(teams);
    roundsLoad.resolve(rounds);
    points.resolve(ROUND_POINTS);
    rulesLoad.resolve(rules);
    await expect(pending).resolves.toMatchObject({ bracketId: "bracket-uuid" });
  });

  it("saves one payload with the server score and 67 games, 63 with picks", async () => {
    const result = await playTournament(buildDto());

    expect(mocks.persistBracket).toHaveBeenCalledTimes(1);
    const payload = savedPayload();
    expect(payload.bracket.score).toBe(result.score);
    expect(payload.bracket.year_id).toBe(YEAR_ID);
    expect(payload.bracket.tournament_scoring_rules_id).toBe(RULES_ID);
    expect(payload.games).toHaveLength(67);
    expect(payload.games.filter((g) => g.pick !== null)).toHaveLength(63);
    expect(payload.games.filter((g) => g.is_play_in)).toHaveLength(4);
    const roundIds = new Set(rounds.map((r) => r.id));
    payload.games.forEach((g) => expect(roundIds).toContain(g.round_id));
  });

  it("returns bracketId, playin, rounds, roundPoints and score, but not bracket or picks", async () => {
    const result = await playTournament(buildDto());

    expect(Object.keys(result).sort()).toEqual(
      ["bracketId", "playin", "roundPoints", "rounds", "score"].sort()
    );
    expect(result.bracketId).toBe("bracket-uuid");
    expect(result.playin).toHaveLength(4);
    expect(result.rounds.finals).toHaveLength(1);
    expect(result.score).toBe(
      Object.values(result.roundPoints).reduce((a, b) => a + b, 0)
    );
  });

  it("signed-in: bracket.user_id = userId and anon_user_id = null", async () => {
    await playTournament(buildDto({ userId: "user-uuid", anonUserId: "anon-uuid" }));

    expect(savedPayload().bracket.user_id).toBe("user-uuid");
    expect(savedPayload().bracket.anon_user_id).toBeNull();
  });

  it("anonymous: anon_user_id set", async () => {
    await playTournament(buildDto({ userId: null, anonUserId: "anon-uuid" }));

    expect(savedPayload().bracket.user_id).toBeNull();
    expect(savedPayload().bracket.anon_user_id).toBe("anon-uuid");
  });

  it("neither owner throws ValidationError", async () => {
    await expect(
      playTournament(buildDto({ userId: null, anonUserId: null }))
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mocks.persistBracket).not.toHaveBeenCalled();
  });

  it("rejects the same team twice in the field", async () => {
    const duplicated: TournamentField = {
      ...field,
      tournamentTeams: [field.tournamentTeams[0], ...field.tournamentTeams.slice(0, 59)],
    };

    const pending = playTournament(buildDto({ fieldToken: signFieldToken({ yearId: YEAR_ID, field: duplicated }) }));
    await expect(pending).rejects.toBeInstanceOf(ValidationError);
    await expect(pending).rejects.toThrow(field.tournamentTeams[0]);
    expect(mocks.persistBracket).not.toHaveBeenCalled();
  });

  it("bad token is rejected before any load", async () => {
    const pending = playTournament(buildDto({ fieldToken: "garbage" }));
    await expect(pending).rejects.toBeInstanceOf(ValidationError);
    await expect(pending).rejects.toThrow(FIELD_TOKEN_INVALID);
    expect(mocks.getTeamStatisticsByYearId).not.toHaveBeenCalled();
    expect(mocks.getTeamsByYearId).not.toHaveBeenCalled();
    expect(mocks.getRounds).not.toHaveBeenCalled();
    expect(mocks.getRoundPoints).not.toHaveBeenCalled();
    expect(mocks.findBracketScoringRulesByYearId).not.toHaveBeenCalled();
    expect(mocks.persistBracket).not.toHaveBeenCalled();
  });

  it("year and field come from the token", async () => {
    const otherYear = "223e4567-e89b-42d3-a456-426614174001";
    await playTournament(
      buildDto({ fieldToken: signFieldToken({ yearId: otherYear, field }) })
    );

    expect(mocks.getTeamsByYearId).toHaveBeenCalledWith(otherYear);
    expect(mocks.findBracketScoringRulesByYearId).toHaveBeenCalledWith(otherYear);
    expect(savedPayload().bracket.year_id).toBe(otherYear);
  });

  it("rejects a field without 68 teams", async () => {
    const short: TournamentField = {
      ...field,
      tournamentTeams: field.tournamentTeams.slice(0, 59),
    };

    await expect(playTournament(buildDto({ fieldToken: signFieldToken({ yearId: YEAR_ID, field: short }) }))).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(mocks.persistBracket).not.toHaveBeenCalled();
  });

  it("rejects an unknown year", async () => {
    mocks.findBracketScoringRulesByYearId.mockResolvedValue(null);
    mocks.getTeamsByYearId.mockResolvedValue([]);
    mocks.getTeamStatisticsByYearId.mockRejectedValue(
      new Error("Failed to fetch year: JSON object requested, multiple (or no) rows returned")
    );

    const pending = playTournament(buildDto());
    await expect(pending).rejects.toBeInstanceOf(ValidationError);
    await expect(pending).rejects.toThrow(YEAR_ID);
    expect(mocks.persistBracket).not.toHaveBeenCalled();
  });

  it("a database error while loading stays a server error", async () => {
    mocks.findBracketScoringRulesByYearId.mockRejectedValue(
      new Error("Failed to fetch bracket scoring rules: connection refused")
    );

    const pending = playTournament(buildDto());
    await expect(pending).rejects.toThrow("connection refused");
    await expect(pending).rejects.not.toBeInstanceOf(ValidationError);
    expect(mocks.persistBracket).not.toHaveBeenCalled();
  });

  it("rejects a field team missing from team stats", async () => {
    const missing = field.tournamentTeams[5];
    const stats: ConferenceMap = Object.fromEntries(
      Object.entries(league.teamStats).map(([conf, confTeams]) => [
        conf,
        Object.fromEntries(
          Object.entries(confTeams).filter(([name]) => name !== missing)
        ),
      ])
    );
    mocks.getTeamStatisticsByYearId.mockResolvedValue(stats);

    const pending = playTournament(buildDto());
    await expect(pending).rejects.toBeInstanceOf(ValidationError);
    await expect(pending).rejects.toThrow(missing);
    expect(mocks.persistBracket).not.toHaveBeenCalled();
  });

  it("rejects a field team missing from the year's teams table", async () => {
    const missing = field.playinTeams.sixteenSeeds[2];
    mocks.getTeamsByYearId.mockResolvedValue(
      teams.filter((t) => t.name !== missing)
    );

    const pending = playTournament(buildDto());
    await expect(pending).rejects.toBeInstanceOf(ValidationError);
    await expect(pending).rejects.toThrow(missing);
    expect(mocks.persistBracket).not.toHaveBeenCalled();
  });

  it("rejects inconsistent picks", async () => {
    const picks: TournamentPicks = chalkPicks(roundOne);
    const outsider = teamNames[100];
    expect(fieldTeams).not.toContain(outsider);
    picks.roundTwoPicks.east![0][0] = { team: outsider, seed: "1" };
    const problems = validateBracketPicks(roundOne, picks);
    expect(problems.length).toBeGreaterThan(0);

    const pending = playTournament(buildDto({ picks }));
    await expect(pending).rejects.toBeInstanceOf(ValidationError);
    await expect(pending).rejects.toThrow(problems.join("; "));
    expect(mocks.persistBracket).not.toHaveBeenCalled();
  });

  it("propagates a repository error", async () => {
    mocks.persistBracket.mockRejectedValue(
      new Error("Failed to persist bracket: boom")
    );

    const pending = playTournament(buildDto());
    await expect(pending).rejects.toThrow("Failed to persist bracket: boom");
    await expect(pending).rejects.not.toBeInstanceOf(ValidationError);
  });
});
