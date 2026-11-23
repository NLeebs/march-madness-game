import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { playSeason } from "@/application/useCases/season";
import { ValidationError } from "@/utils/errorHandling";
import { verifyFieldToken } from "@/utils/api/fieldToken";
import { expandSeason } from "@/src/functions/regularSeason/seasonWire";
import { buildLeague } from "@/tests/factories";

const mocks = vi.hoisted(() => ({
  getTeamStatisticsByYearId: vi.fn(),
  findBracketScoringRulesByYearId: vi.fn(),
}));

vi.mock("@/infrastructure/db/TournamentRepository", () => ({
  TournamentRepository: vi.fn().mockImplementation(() => ({
    findBracketScoringRulesByYearId: mocks.findBracketScoringRulesByYearId,
  })),
}));

vi.mock("@/application/useCases/team/GetTeamStatisticsByYearId", () => ({
  getTeamStatisticsByYearId: mocks.getTeamStatisticsByYearId,
}));

const YEAR_ID = "123e4567-e89b-42d3-a456-426614174000";
const TEST_SECRET = "test-signing-secret-".padEnd(48, "0");
const league = buildLeague();

describe("playSeason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTeamStatisticsByYearId.mockResolvedValue(league.teamStats);
    mocks.findBracketScoringRulesByYearId.mockResolvedValue({ id: "rules" });
  });
  afterEach(() => {
    // unstubAllEnvs would also drop the secret stubbed in src/test-setup.ts
    vi.stubEnv("GAME_SIGNING_SECRET", TEST_SECRET);
  });

  it("unknown year (no scoring rules) is a ValidationError even when stats load", async () => {
    mocks.findBracketScoringRulesByYearId.mockResolvedValue(null);
    await expect(playSeason({ yearId: YEAR_ID })).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it("unknown year wins over a team-stats load failure", async () => {
    mocks.findBracketScoringRulesByYearId.mockResolvedValue(null);
    mocks.getTeamStatisticsByYearId.mockRejectedValue(new Error("db down"));
    await expect(playSeason({ yearId: YEAR_ID })).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it("the token verifies and carries the selection's field and the yearId", async () => {
    const result = await playSeason({ yearId: YEAR_ID });
    const verified = verifyFieldToken(result.fieldToken);
    expect(verified.yearId).toBe(YEAR_ID);
    expect(result.yearId).toBe(YEAR_ID);
    expect(verified.field).toEqual({
      tournamentTeams: result.selection.field,
      playinTeams: {
        elevenSeeds: result.selection.elevenSeedPlayins,
        sixteenSeeds: result.selection.sixteenSeedPlayins,
      },
    });
  });

  it("weeks expand to 30 weeks covering every team", async () => {
    const result = await playSeason({ yearId: YEAR_ID });
    const { weeks } = expandSeason(result, league.teamStats);
    expect(weeks).toHaveLength(30);
    const seen = new Set<string>();
    for (const week of weeks)
      for (const g of week) {
        seen.add(g.favoredTeam);
        seen.add(g.underdogTeam);
      }
    expect(seen.size).toBe(result.teams.length);
  }, 30000);

  it("a team-stats load failure is rethrown (server error)", async () => {
    mocks.getTeamStatisticsByYearId.mockRejectedValue(new Error("db down"));
    const error = await playSeason({ yearId: YEAR_ID }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ValidationError);
    expect(error.message).toBe("db down");
  });

  it("a missing secret rejects with a plain Error, not ValidationError", async () => {
    vi.stubEnv("GAME_SIGNING_SECRET", "");
    const error = await playSeason({ yearId: YEAR_ID }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ValidationError);
  });
});
