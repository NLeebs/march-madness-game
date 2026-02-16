import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserBracketsByYearId } from "@/application/useCases/GetUserBracketsByYearId";
import { buildBracket } from "@/tests/factories";

const mockGetBracketsByUserIdAndYearId = vi.fn();

vi.mock("@/infrastructure/db/TournamentRepository", () => ({
  TournamentRepository: vi.fn().mockImplementation(() => ({
    getBracketsByUserIdAndYearId: mockGetBracketsByUserIdAndYearId,
  })),
}));

describe("getUserBracketsByYearId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return brackets for a valid userId and yearId", async () => {
    const expectedBrackets = [buildBracket(), buildBracket({ score: 85 })];
    mockGetBracketsByUserIdAndYearId.mockResolvedValue(expectedBrackets);

    const result = await getUserBracketsByYearId("user-uuid-123", "year-uuid-1");

    expect(result).toEqual(expectedBrackets);
  });

  it("should forward both userId and yearId to the repository", async () => {
    mockGetBracketsByUserIdAndYearId.mockResolvedValue([]);

    await getUserBracketsByYearId("specific-user-id", "specific-year-id");

    expect(mockGetBracketsByUserIdAndYearId).toHaveBeenCalledWith(
      "specific-user-id",
      "specific-year-id"
    );
    expect(mockGetBracketsByUserIdAndYearId).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no brackets exist", async () => {
    mockGetBracketsByUserIdAndYearId.mockResolvedValue([]);

    const result = await getUserBracketsByYearId("user-uuid-123", "year-uuid-1");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return brackets with expected fields", async () => {
    const bracket = buildBracket({
      id: "bracket-abc",
      score: 100,
      created_at: "2025-03-21T14:00:00Z",
    });
    mockGetBracketsByUserIdAndYearId.mockResolvedValue([bracket]);

    const result = await getUserBracketsByYearId("user-uuid-123", "year-uuid-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("bracket-abc");
    expect(result[0].score).toBe(100);
    expect(result[0].created_at).toBe("2025-03-21T14:00:00Z");
  });

  it("should return multiple brackets for the same user and year", async () => {
    const brackets = [
      buildBracket({ id: "bracket-1", score: 42 }),
      buildBracket({ id: "bracket-2", score: 67 }),
      buildBracket({ id: "bracket-3", score: 91 }),
    ];
    mockGetBracketsByUserIdAndYearId.mockResolvedValue(brackets);

    const result = await getUserBracketsByYearId("user-uuid-123", "year-uuid-1");

    expect(result).toHaveLength(3);
    expect(result.map((b) => b.score)).toEqual([42, 67, 91]);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetBracketsByUserIdAndYearId.mockRejectedValue(
      new Error("Failed to fetch brackets: connection refused")
    );

    await expect(
      getUserBracketsByYearId("user-uuid-123", "year-uuid-1")
    ).rejects.toThrow("Failed to fetch brackets: connection refused");
  });

  it("should propagate database errors from the repository", async () => {
    mockGetBracketsByUserIdAndYearId.mockRejectedValue(
      new Error("Failed to fetch brackets: PGRST116")
    );

    await expect(
      getUserBracketsByYearId("user-uuid-123", "year-uuid-1")
    ).rejects.toThrow("Failed to fetch brackets: PGRST116");
  });
});
