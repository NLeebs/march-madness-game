import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTeamsInMostFinalFoursByYear } from "@/application/useCases";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTeamsWithMostFinalFoursByYear = vi.fn();

vi.mock("@/infrastructure/db/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    getTeamsWithMostFinalFoursByYear: mockGetTeamsWithMostFinalFoursByYear,
  })),
}));

describe("getTeamsInMostFinalFoursByYear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return teams in most final fours for a valid year id", async () => {
    const expectedTeams = [
      buildTeamPerformance({ final_fours: 8 }),
      buildTeamPerformance({
        team_id: "33333333-3333-3333-3333-333333333333",
        team_name: "UCLA",
        team_logo: "/team-logos/pac-12/ucla.png",
        conference_id: "44444444-4444-4444-4444-444444444444",
        final_fours: 7,
      }),
    ];
    mockGetTeamsWithMostFinalFoursByYear.mockResolvedValue(expectedTeams);

    const result = await getTeamsInMostFinalFoursByYear("year-uuid-1");

    expect(result).toEqual(expectedTeams);
  });

  it("should forward year id to the repository", async () => {
    mockGetTeamsWithMostFinalFoursByYear.mockResolvedValue([]);

    await getTeamsInMostFinalFoursByYear("specific-year-id");

    expect(mockGetTeamsWithMostFinalFoursByYear).toHaveBeenCalledWith(
      "specific-year-id",
    );
    expect(mockGetTeamsWithMostFinalFoursByYear).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no teams are found", async () => {
    mockGetTeamsWithMostFinalFoursByYear.mockResolvedValue([]);

    const result = await getTeamsInMostFinalFoursByYear("year-uuid-1");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return final four records with expected fields", async () => {
    const finalFourTeam = buildTeamPerformance({
      team_id: "55555555-5555-5555-5555-555555555555",
      team_name: "Duke",
      team_logo: "/team-logos/acc/duke.png",
      conference_id: "66666666-6666-6666-6666-666666666666",
      final_fours: 9,
    });
    mockGetTeamsWithMostFinalFoursByYear.mockResolvedValue([finalFourTeam]);

    const result = await getTeamsInMostFinalFoursByYear("year-uuid-1");

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe("55555555-5555-5555-5555-555555555555");
    expect(result[0].team_name).toBe("Duke");
    expect(result[0].team_logo).toBe("/team-logos/acc/duke.png");
    expect(result[0].conference_id).toBe(
      "66666666-6666-6666-6666-666666666666",
    );
    expect(result[0].final_fours).toBe(9);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetTeamsWithMostFinalFoursByYear.mockRejectedValue(
      new Error("Failed to fetch teams with most final fours: connection refused"),
    );

    await expect(getTeamsInMostFinalFoursByYear("year-uuid-1")).rejects.toThrow(
      "Failed to fetch teams with most final fours: connection refused",
    );
  });

  it("should propagate errors when no final four records are found", async () => {
    mockGetTeamsWithMostFinalFoursByYear.mockRejectedValue(
      new Error("No teams with most final fours found for year_id: year-uuid-1"),
    );

    await expect(getTeamsInMostFinalFoursByYear("year-uuid-1")).rejects.toThrow(
      "No teams with most final fours found for year_id: year-uuid-1",
    );
  });
});
