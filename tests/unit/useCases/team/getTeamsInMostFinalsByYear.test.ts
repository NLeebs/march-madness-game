import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTeamsInMostFinalsByYear } from "@/application/useCases";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTeamsWithMostFinalsByYear = vi.fn();

vi.mock("@/infrastructure/db/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    getTeamsWithMostFinalsByYear: mockGetTeamsWithMostFinalsByYear,
  })),
}));

describe("getTeamsInMostFinalsByYear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return teams in most finals for a valid year id", async () => {
    const expectedTeams = [
      buildTeamPerformance({ finals: 4 }),
      buildTeamPerformance({
        team_id: "33333333-3333-3333-3333-333333333333",
        team_name: "Kansas",
        team_logo: "/team-logos/big-12/kansas.png",
        conference_id: "44444444-4444-4444-4444-444444444444",
        finals: 3,
      }),
    ];
    mockGetTeamsWithMostFinalsByYear.mockResolvedValue(expectedTeams);

    const result = await getTeamsInMostFinalsByYear("year-uuid-1");

    expect(result).toEqual(expectedTeams);
  });

  it("should forward year id to the repository", async () => {
    mockGetTeamsWithMostFinalsByYear.mockResolvedValue([]);

    await getTeamsInMostFinalsByYear("specific-year-id");

    expect(mockGetTeamsWithMostFinalsByYear).toHaveBeenCalledWith(
      "specific-year-id",
    );
    expect(mockGetTeamsWithMostFinalsByYear).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no teams are found", async () => {
    mockGetTeamsWithMostFinalsByYear.mockResolvedValue([]);

    const result = await getTeamsInMostFinalsByYear("year-uuid-1");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return finals records with expected fields", async () => {
    const finalsTeam = buildTeamPerformance({
      team_id: "55555555-5555-5555-5555-555555555555",
      team_name: "North Carolina",
      team_logo: "/team-logos/acc/unc.png",
      conference_id: "66666666-6666-6666-6666-666666666666",
      finals: 6,
    });
    mockGetTeamsWithMostFinalsByYear.mockResolvedValue([finalsTeam]);

    const result = await getTeamsInMostFinalsByYear("year-uuid-1");

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe("55555555-5555-5555-5555-555555555555");
    expect(result[0].team_name).toBe("North Carolina");
    expect(result[0].team_logo).toBe("/team-logos/acc/unc.png");
    expect(result[0].conference_id).toBe(
      "66666666-6666-6666-6666-666666666666",
    );
    expect(result[0].finals).toBe(6);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetTeamsWithMostFinalsByYear.mockRejectedValue(
      new Error("Failed to fetch teams with most finals: connection refused"),
    );

    await expect(getTeamsInMostFinalsByYear("year-uuid-1")).rejects.toThrow(
      "Failed to fetch teams with most finals: connection refused",
    );
  });

  it("should propagate errors when no finals records are found", async () => {
    mockGetTeamsWithMostFinalsByYear.mockRejectedValue(
      new Error("No teams with most finals found for year_id: year-uuid-1"),
    );

    await expect(getTeamsInMostFinalsByYear("year-uuid-1")).rejects.toThrow(
      "No teams with most finals found for year_id: year-uuid-1",
    );
  });
});
