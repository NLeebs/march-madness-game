import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTeamsInMostSweetSixteensByYear } from "@/application/useCases";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTeamsWithMostSweetSixteensByYear = vi.fn();

vi.mock("@/infrastructure/db/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    getTeamsWithMostSweetSixteensByYear: mockGetTeamsWithMostSweetSixteensByYear,
  })),
}));

describe("getTeamsInMostSweetSixteensByYear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return teams in most sweet sixteens for a valid year id", async () => {
    const expectedTeams = [
      buildTeamPerformance({ sweet_sixteens: 14 }),
      buildTeamPerformance({
        team_id: "33333333-3333-3333-3333-333333333333",
        team_name: "Syracuse",
        team_logo: "/team-logos/acc/syracuse.png",
        conference_id: "44444444-4444-4444-4444-444444444444",
        sweet_sixteens: 12,
      }),
    ];
    mockGetTeamsWithMostSweetSixteensByYear.mockResolvedValue(expectedTeams);

    const result = await getTeamsInMostSweetSixteensByYear("year-uuid-1");

    expect(result).toEqual(expectedTeams);
  });

  it("should forward year id to the repository", async () => {
    mockGetTeamsWithMostSweetSixteensByYear.mockResolvedValue([]);

    await getTeamsInMostSweetSixteensByYear("specific-year-id");

    expect(mockGetTeamsWithMostSweetSixteensByYear).toHaveBeenCalledWith(
      "specific-year-id",
    );
    expect(mockGetTeamsWithMostSweetSixteensByYear).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no teams are found", async () => {
    mockGetTeamsWithMostSweetSixteensByYear.mockResolvedValue([]);

    const result = await getTeamsInMostSweetSixteensByYear("year-uuid-1");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return sweet sixteen records with expected fields", async () => {
    const sweetSixteenTeam = buildTeamPerformance({
      team_id: "55555555-5555-5555-5555-555555555555",
      team_name: "Arizona",
      team_logo: "/team-logos/pac-12/arizona.png",
      conference_id: "66666666-6666-6666-6666-666666666666",
      sweet_sixteens: 13,
    });
    mockGetTeamsWithMostSweetSixteensByYear.mockResolvedValue([sweetSixteenTeam]);

    const result = await getTeamsInMostSweetSixteensByYear("year-uuid-1");

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe("55555555-5555-5555-5555-555555555555");
    expect(result[0].team_name).toBe("Arizona");
    expect(result[0].team_logo).toBe("/team-logos/pac-12/arizona.png");
    expect(result[0].conference_id).toBe(
      "66666666-6666-6666-6666-666666666666",
    );
    expect(result[0].sweet_sixteens).toBe(13);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetTeamsWithMostSweetSixteensByYear.mockRejectedValue(
      new Error("Failed to fetch teams with most sweet sixteens: connection refused"),
    );

    await expect(getTeamsInMostSweetSixteensByYear("year-uuid-1")).rejects.toThrow(
      "Failed to fetch teams with most sweet sixteens: connection refused",
    );
  });

  it("should propagate errors when no sweet sixteen records are found", async () => {
    mockGetTeamsWithMostSweetSixteensByYear.mockRejectedValue(
      new Error("No teams with most sweet sixteens found for year_id: year-uuid-1"),
    );

    await expect(getTeamsInMostSweetSixteensByYear("year-uuid-1")).rejects.toThrow(
      "No teams with most sweet sixteens found for year_id: year-uuid-1",
    );
  });
});
