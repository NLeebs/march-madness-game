import { describe, it, expect, vi, beforeEach } from "vitest";
import { getScoringRuleIdByYearId } from "@/application/useCases";
import { BracketScoringRuleSupabase } from "@/models/appStatsData/BracketScoringRuleSupabase";

const mockGetBracketScoringRulesByYearId = vi.fn();

vi.mock("@/infrastructure/db/TournamentRepository", () => ({
  TournamentRepository: vi.fn().mockImplementation(() => ({
    getBracketScoringRulesByYearId: mockGetBracketScoringRulesByYearId,
  })),
}));

describe("getScoringRuleIdByYearId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the scoring rule id for a valid yearId", async () => {
    const mockScoringRule: BracketScoringRuleSupabase = {
      id: "scoring-rule-uuid-123",
      year_id: "year-uuid-456",
      description: "Standard bracket scoring",
      version: 1,
    };

    mockGetBracketScoringRulesByYearId.mockResolvedValue(mockScoringRule);

    const result = await getScoringRuleIdByYearId("year-uuid-456");

    expect(result).toBe("scoring-rule-uuid-123");
    expect(mockGetBracketScoringRulesByYearId).toHaveBeenCalledWith(
      "year-uuid-456",
    );
    expect(mockGetBracketScoringRulesByYearId).toHaveBeenCalledTimes(1);
  });

  it("should pass the yearId argument to the repository", async () => {
    const yearId = "specific-year-uuid";
    mockGetBracketScoringRulesByYearId.mockResolvedValue({
      id: "rule-id",
      year_id: yearId,
      description: "Test",
      version: 1,
    });

    await getScoringRuleIdByYearId(yearId);

    expect(mockGetBracketScoringRulesByYearId).toHaveBeenCalledWith(yearId);
  });

  it("should return the id from the scoring rule object", async () => {
    const expectedId = "unique-scoring-rule-id";
    mockGetBracketScoringRulesByYearId.mockResolvedValue({
      id: expectedId,
      year_id: "year-id",
      description: "v2 scoring",
      version: 2,
    });

    const result = await getScoringRuleIdByYearId("year-id");

    expect(result).toBe(expectedId);
  });

  it("should propagate errors from the repository", async () => {
    mockGetBracketScoringRulesByYearId.mockRejectedValue(
      new Error("Failed to fetch bracket scoring rules: connection refused"),
    );

    await expect(getScoringRuleIdByYearId("bad-year-id")).rejects.toThrow(
      "Failed to fetch bracket scoring rules",
    );
  });

  it("should propagate not-found errors from the repository", async () => {
    mockGetBracketScoringRulesByYearId.mockRejectedValue(
      new Error("No bracket scoring rules found for year_id: nonexistent-year"),
    );

    await expect(getScoringRuleIdByYearId("nonexistent-year")).rejects.toThrow(
      "No bracket scoring rules found",
    );
  });

  it("should return undefined when the scoring rule has no id", async () => {
    mockGetBracketScoringRulesByYearId.mockResolvedValue({
      year_id: "year-id",
      description: "No id scoring rule",
      version: 1,
    });

    const result = await getScoringRuleIdByYearId("year-id");

    expect(result).toBeUndefined();
  });
});
