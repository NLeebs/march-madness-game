import { describe, it, expect, vi, beforeEach } from "vitest";
import { getYears } from "@/application/useCases";
import { buildYear } from "@/tests/factories";

const mockGetYears = vi.fn();
const mockGetTeamStatsYears = vi.fn();

vi.mock("@/infrastructure/db/TournamentRepository", () => ({
  TournamentRepository: vi.fn().mockImplementation(() => ({
    getYears: mockGetYears,
  })),
}));

vi.mock("@/infrastructure/db/TeamStatsRepository", () => ({
  TeamStatsRepository: vi.fn().mockImplementation(() => ({
    getYears: mockGetTeamStatsYears,
  })),
}));

describe("getYears", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return only years that exist in both repositories", async () => {
    const tournamentYears = [
      buildYear({ id: "id-1", year: 2023 }),
      buildYear({ id: "id-2", year: 2024 }),
      buildYear({ id: "id-3", year: 2025 }),
    ];
    mockGetYears.mockResolvedValue(tournamentYears);
    mockGetTeamStatsYears.mockResolvedValue(["2023", "2025"]);

    const result = await getYears();

    expect(result).toEqual([tournamentYears[0], tournamentYears[2]]);
  });

  it("should return all tournament years when all have matching team stats", async () => {
    const tournamentYears = [
      buildYear({ id: "id-1", year: 2024 }),
      buildYear({ id: "id-2", year: 2025 }),
    ];
    mockGetYears.mockResolvedValue(tournamentYears);
    mockGetTeamStatsYears.mockResolvedValue(["2024", "2025"]);

    const result = await getYears();

    expect(result).toEqual(tournamentYears);
  });

  it("should return an empty array when no years overlap", async () => {
    mockGetYears.mockResolvedValue([
      buildYear({ year: 2023 }),
      buildYear({ year: 2024 }),
    ]);
    mockGetTeamStatsYears.mockResolvedValue(["2020", "2021"]);

    const result = await getYears();

    expect(result).toEqual([]);
  });

  it("should return an empty array when tournament years is empty", async () => {
    mockGetYears.mockResolvedValue([]);
    mockGetTeamStatsYears.mockResolvedValue(["2024", "2025"]);

    const result = await getYears();

    expect(result).toEqual([]);
  });

  it("should return an empty array when team stats years is empty", async () => {
    mockGetYears.mockResolvedValue([buildYear({ year: 2024 })]);
    mockGetTeamStatsYears.mockResolvedValue([]);

    const result = await getYears();

    expect(result).toEqual([]);
  });

  it("should compare tournament year numbers against string team stats years", async () => {
    const tournamentYears = [buildYear({ id: "id-1", year: 2025 })];
    mockGetYears.mockResolvedValue(tournamentYears);
    mockGetTeamStatsYears.mockResolvedValue(["2025"]);

    const result = await getYears();

    expect(result).toEqual(tournamentYears);
  });

  it("should call both repositories", async () => {
    mockGetYears.mockResolvedValue([]);
    mockGetTeamStatsYears.mockResolvedValue([]);

    await getYears();

    expect(mockGetYears).toHaveBeenCalledTimes(1);
    expect(mockGetTeamStatsYears).toHaveBeenCalledTimes(1);
  });

  it("should propagate errors from TournamentRepository", async () => {
    mockGetYears.mockRejectedValue(
      new Error("Failed to fetch years: connection refused"),
    );

    await expect(getYears()).rejects.toThrow("Failed to fetch years");
  });

  it("should propagate errors from TeamStatsRepository", async () => {
    mockGetYears.mockResolvedValue([]);
    mockGetTeamStatsYears.mockRejectedValue(
      new Error("Error fetching team statistics years from Firebase"),
    );

    await expect(getYears()).rejects.toThrow(
      "Error fetching team statistics years from Firebase",
    );
  });
});
