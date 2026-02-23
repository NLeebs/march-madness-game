import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserTotalStatsByYearId } from "@/application/useCases/GetUserTotalStatsByYearId";
import { buildUserTotalStats } from "@/tests/factories";

const mockGetUserTotalStatsByYearId = vi.fn();

vi.mock("@/infrastructure/db/TournamentRepository", () => ({
  TournamentRepository: vi.fn().mockImplementation(() => ({
    getUserTotalStatsByYearId: mockGetUserTotalStatsByYearId,
  })),
}));

describe("getUserTotalStatsByYearId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return user total stats for a valid userId and yearId", async () => {
    const expectedStats = buildUserTotalStats();
    mockGetUserTotalStatsByYearId.mockResolvedValue(expectedStats);

    const result = await getUserTotalStatsByYearId("user-uuid-123", "year-uuid-1");

    expect(result).toEqual(expectedStats);
  });

  it("should forward both userId and yearId to the repository", async () => {
    mockGetUserTotalStatsByYearId.mockResolvedValue(buildUserTotalStats());

    await getUserTotalStatsByYearId("specific-user-id", "specific-year-id");

    expect(mockGetUserTotalStatsByYearId).toHaveBeenCalledWith(
      "specific-user-id",
      "specific-year-id"
    );
    expect(mockGetUserTotalStatsByYearId).toHaveBeenCalledTimes(1);
  });

  it("should return stats with expected scoring fields", async () => {
    const stats = buildUserTotalStats({
      high_score: 150,
      low_score: 30,
      average_score: 95.0,
      average_score_rank: 2,
    });
    mockGetUserTotalStatsByYearId.mockResolvedValue(stats);

    const result = await getUserTotalStatsByYearId("user-uuid-123", "year-uuid-1");

    expect(result.high_score).toBe(150);
    expect(result.low_score).toBe(30);
    expect(result.average_score).toBe(95.0);
    expect(result.average_score_rank).toBe(2);
  });

  it("should return stats with expected bracket totals", async () => {
    const stats = buildUserTotalStats({
      total_brackets: 25,
      total_picks: 1575,
      total_correct_picks: 900,
      correct_pick_percentage: 57.14,
    });
    mockGetUserTotalStatsByYearId.mockResolvedValue(stats);

    const result = await getUserTotalStatsByYearId("user-uuid-123", "year-uuid-1");

    expect(result.total_brackets).toBe(25);
    expect(result.total_picks).toBe(1575);
    expect(result.total_correct_picks).toBe(900);
    expect(result.correct_pick_percentage).toBe(57.14);
  });

  it("should return stats with round-level accuracy fields", async () => {
    const stats = buildUserTotalStats({
      round_one_correct_percentage: 75.0,
      round_two_correct_percentage: 60.0,
      sweet_sixteen_correct_percentage: 50.0,
      elite_eight_correct_percentage: 40.0,
      final_four_correct_percentage: 25.0,
      champion_correct_percentage: 10.0,
    });
    mockGetUserTotalStatsByYearId.mockResolvedValue(stats);

    const result = await getUserTotalStatsByYearId("user-uuid-123", "year-uuid-1");

    expect(result.round_one_correct_percentage).toBe(75.0);
    expect(result.round_two_correct_percentage).toBe(60.0);
    expect(result.sweet_sixteen_correct_percentage).toBe(50.0);
    expect(result.elite_eight_correct_percentage).toBe(40.0);
    expect(result.final_four_correct_percentage).toBe(25.0);
    expect(result.champion_correct_percentage).toBe(10.0);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetUserTotalStatsByYearId.mockRejectedValue(
      new Error("Failed to fetch user total stats: connection refused")
    );

    await expect(
      getUserTotalStatsByYearId("user-uuid-123", "year-uuid-1")
    ).rejects.toThrow("Failed to fetch user total stats: connection refused");
  });

  it("should propagate not-found errors from the repository", async () => {
    mockGetUserTotalStatsByYearId.mockRejectedValue(
      new Error(
        "No user total stats found for user_id: user-uuid-123 and year_id: year-uuid-1"
      )
    );

    await expect(
      getUserTotalStatsByYearId("user-uuid-123", "year-uuid-1")
    ).rejects.toThrow("No user total stats found for user_id");
  });
});
