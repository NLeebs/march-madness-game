import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTopPerformingTeamsByYear } from "@/application/useCases";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTopPerformingTeamsByYear = vi.fn();

vi.mock("@/infrastructure/db/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    getTopPerformingTeamsByYear: mockGetTopPerformingTeamsByYear,
  })),
}));

describe("getTopPerformingTeamsByYear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return top performing teams for a valid year id", async () => {
    const expectedTeams = [
      buildTeamPerformance(),
      buildTeamPerformance({
        team_id: "33333333-3333-3333-3333-333333333333",
        team_name: "UConn",
        team_logo: "/team-logos/big-east/uconn.png",
        conference_id: "44444444-4444-4444-4444-444444444444",
        tournament_points_scored: 141,
      }),
    ];
    mockGetTopPerformingTeamsByYear.mockResolvedValue(expectedTeams);

    const result = await getTopPerformingTeamsByYear("year-uuid-1");

    expect(result).toEqual(expectedTeams);
  });

  it("should forward year id to the repository", async () => {
    mockGetTopPerformingTeamsByYear.mockResolvedValue([]);

    await getTopPerformingTeamsByYear("specific-year-id");

    expect(mockGetTopPerformingTeamsByYear).toHaveBeenCalledWith(
      "specific-year-id",
    );
    expect(mockGetTopPerformingTeamsByYear).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no teams are found", async () => {
    mockGetTopPerformingTeamsByYear.mockResolvedValue([]);

    const result = await getTopPerformingTeamsByYear("year-uuid-1");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return team performance records with expected fields", async () => {
    const topPerformingTeam = buildTeamPerformance({
      team_id: "55555555-5555-5555-5555-555555555555",
      team_name: "Arizona",
      team_logo: "/team-logos/pac-12/arizona.png",
      conference_id: "66666666-6666-6666-6666-666666666666",
      championships: 1,
      finals: 2,
    });
    mockGetTopPerformingTeamsByYear.mockResolvedValue([topPerformingTeam]);

    const result = await getTopPerformingTeamsByYear("year-uuid-1");

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe("55555555-5555-5555-5555-555555555555");
    expect(result[0].team_name).toBe("Arizona");
    expect(result[0].team_logo).toBe("/team-logos/pac-12/arizona.png");
    expect(result[0].conference_id).toBe(
      "66666666-6666-6666-6666-666666666666",
    );
    expect(result[0].championships).toBe(1);
    expect(result[0].finals).toBe(2);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetTopPerformingTeamsByYear.mockRejectedValue(
      new Error("Failed to fetch top performing teams: connection refused"),
    );

    await expect(getTopPerformingTeamsByYear("year-uuid-1")).rejects.toThrow(
      "Failed to fetch top performing teams: connection refused",
    );
  });

  it("should propagate errors when no team performance records are found", async () => {
    mockGetTopPerformingTeamsByYear.mockRejectedValue(
      new Error("No top performing teams found for year_id: year-uuid-1"),
    );

    await expect(getTopPerformingTeamsByYear("year-uuid-1")).rejects.toThrow(
      "No top performing teams found for year_id: year-uuid-1",
    );
  });
});
