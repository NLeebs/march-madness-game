import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFirstRoundSeedMatchupUpsetPercentageByYearId } from "@/application/useCases";
import { buildSeedPerformance } from "@/tests/factories";

const mockGetFirstRoundSeedMatchupUpsetPercentagesByYearId = vi.fn();

vi.mock("@/infrastructure/db/SeedRepository", () => ({
  SeedRepository: vi.fn().mockImplementation(() => ({
    getFirstRoundSeedMatchupUpsetPercentagesByYearId:
      mockGetFirstRoundSeedMatchupUpsetPercentagesByYearId,
  })),
}));

describe("getFirstRoundSeedMatchupUpsetPercentageByYearId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return first round seed matchup upset percentages for a valid year id", async () => {
    const expectedSeedPerformance = [
      buildSeedPerformance(),
      buildSeedPerformance({
        higher_seed: 6,
        lower_seed: 11,
        upset_percentage: 37.8,
      }),
    ];
    mockGetFirstRoundSeedMatchupUpsetPercentagesByYearId.mockResolvedValue(
      expectedSeedPerformance,
    );

    const result =
      await getFirstRoundSeedMatchupUpsetPercentageByYearId("year-uuid-1");

    expect(result).toEqual(expectedSeedPerformance);
  });

  it("should forward year id to the repository", async () => {
    mockGetFirstRoundSeedMatchupUpsetPercentagesByYearId.mockResolvedValue([]);

    await getFirstRoundSeedMatchupUpsetPercentageByYearId("specific-year-id");

    expect(
      mockGetFirstRoundSeedMatchupUpsetPercentagesByYearId,
    ).toHaveBeenCalledWith("specific-year-id");
    expect(
      mockGetFirstRoundSeedMatchupUpsetPercentagesByYearId,
    ).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no seed performance records are found", async () => {
    mockGetFirstRoundSeedMatchupUpsetPercentagesByYearId.mockResolvedValue([]);

    const result =
      await getFirstRoundSeedMatchupUpsetPercentageByYearId("year-uuid-1");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return seed performance records with expected fields", async () => {
    const seedPerformance = buildSeedPerformance({
      upset_percentage: 45.5,
      higher_seed: 7,
      lower_seed: 10,
      round_id: "22222222-2222-2222-2222-222222222222",
    });
    mockGetFirstRoundSeedMatchupUpsetPercentagesByYearId.mockResolvedValue([
      seedPerformance,
    ]);

    const result =
      await getFirstRoundSeedMatchupUpsetPercentageByYearId("year-uuid-1");

    expect(result).toHaveLength(1);
    expect(result[0].upset_percentage).toBe(45.5);
    expect(result[0].higher_seed).toBe(7);
    expect(result[0].lower_seed).toBe(10);
    expect(result[0].round_id).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetFirstRoundSeedMatchupUpsetPercentagesByYearId.mockRejectedValue(
      new Error("Failed to fetch seed performance: connection refused"),
    );

    await expect(
      getFirstRoundSeedMatchupUpsetPercentageByYearId("year-uuid-1"),
    ).rejects.toThrow("Failed to fetch seed performance: connection refused");
  });

  it("should propagate errors when no seed performance records are found", async () => {
    mockGetFirstRoundSeedMatchupUpsetPercentagesByYearId.mockRejectedValue(
      new Error("No seed performance found for year_id: year-uuid-1"),
    );

    await expect(
      getFirstRoundSeedMatchupUpsetPercentageByYearId("year-uuid-1"),
    ).rejects.toThrow("No seed performance found for year_id: year-uuid-1");
  });
});
