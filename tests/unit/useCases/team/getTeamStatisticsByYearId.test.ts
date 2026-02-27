import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTeamStatisticsByYearId } from "@/application/useCases";
import { buildYear, buildConferenceMap } from "@/tests/factories";

const mockGetYearById = vi.fn();
const mockGetTeamStatsByYearId = vi.fn();

vi.mock("@/infrastructure/db/TournamentRepository", () => ({
  TournamentRepository: vi.fn().mockImplementation(() => ({
    getYearById: mockGetYearById,
  })),
}));

vi.mock("@/infrastructure/db/TeamStatsRepository", () => ({
  TeamStatsRepository: vi.fn().mockImplementation(() => ({
    getTeamStatsByYearId: mockGetTeamStatsByYearId,
  })),
}));

const mockYear = buildYear();

const mockTeamStats = buildConferenceMap({
  acc: { Duke: {} },
  bigTen: { Purdue: {} },
});

describe("getTeamStatisticsByYearId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return team statistics for a valid yearId", async () => {
    mockGetYearById.mockResolvedValue(mockYear);
    mockGetTeamStatsByYearId.mockResolvedValue(mockTeamStats);

    const result = await getTeamStatisticsByYearId("year-uuid-123");

    expect(result).toEqual(mockTeamStats);
  });

  it("should pass the yearId to TournamentRepository.getYearById", async () => {
    mockGetYearById.mockResolvedValue(mockYear);
    mockGetTeamStatsByYearId.mockResolvedValue(mockTeamStats);

    await getTeamStatisticsByYearId("year-uuid-123");

    expect(mockGetYearById).toHaveBeenCalledWith("year-uuid-123");
    expect(mockGetYearById).toHaveBeenCalledTimes(1);
  });

  it("should pass the numeric year to TeamStatsRepository.getTeamStatsByYearId", async () => {
    mockGetYearById.mockResolvedValue({ id: "id", year: 2024 });
    mockGetTeamStatsByYearId.mockResolvedValue(mockTeamStats);

    await getTeamStatisticsByYearId("some-year-uuid");

    expect(mockGetTeamStatsByYearId).toHaveBeenCalledWith(2024);
    expect(mockGetTeamStatsByYearId).toHaveBeenCalledTimes(1);
  });

  it("should call getYearById before getTeamStatsByYearId", async () => {
    const callOrder: string[] = [];

    mockGetYearById.mockImplementation(async () => {
      callOrder.push("getYearById");
      return mockYear;
    });
    mockGetTeamStatsByYearId.mockImplementation(async () => {
      callOrder.push("getTeamStatsByYearId");
      return mockTeamStats;
    });

    await getTeamStatisticsByYearId("year-uuid-123");

    expect(callOrder).toEqual(["getYearById", "getTeamStatsByYearId"]);
  });

  it("should propagate errors when getYearById fails", async () => {
    mockGetYearById.mockRejectedValue(
      new Error("Failed to fetch year: connection refused"),
    );

    await expect(getTeamStatisticsByYearId("bad-uuid")).rejects.toThrow(
      "Failed to fetch year",
    );

    expect(mockGetTeamStatsByYearId).not.toHaveBeenCalled();
  });

  it("should propagate errors when year is not found", async () => {
    mockGetYearById.mockRejectedValue(
      new Error("No year found for id: nonexistent-uuid"),
    );

    await expect(getTeamStatisticsByYearId("nonexistent-uuid")).rejects.toThrow(
      "No year found for id",
    );

    expect(mockGetTeamStatsByYearId).not.toHaveBeenCalled();
  });

  it("should propagate errors when getTeamStatsByYearId fails", async () => {
    mockGetYearById.mockResolvedValue(mockYear);
    mockGetTeamStatsByYearId.mockRejectedValue(
      new Error("Error fetching team statistics by year from Firebase: 2025"),
    );

    await expect(getTeamStatisticsByYearId("year-uuid-123")).rejects.toThrow(
      "Error fetching team statistics by year from Firebase",
    );
  });

  it("should not call getTeamStatsByYearId when getYearById throws", async () => {
    mockGetYearById.mockRejectedValue(new Error("Year lookup failed"));

    await expect(getTeamStatisticsByYearId("year-uuid-123")).rejects.toThrow();

    expect(mockGetTeamStatsByYearId).not.toHaveBeenCalled();
  });
});
