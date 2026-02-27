import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTeamsInMostSecondRoundsByYear } from "@/application/useCases";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTeamsWithMostSecondRoundsByYear = vi.fn();

vi.mock("@/infrastructure/db/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    getTeamsWithMostSecondRoundsByYear: mockGetTeamsWithMostSecondRoundsByYear,
  })),
}));

describe("getTeamsInMostSecondRoundsByYear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return teams in most second rounds for a valid year id", async () => {
    const expectedTeams = [
      buildTeamPerformance({ second_rounds: 18 }),
      buildTeamPerformance({
        team_id: "33333333-3333-3333-3333-333333333333",
        team_name: "Gonzaga",
        team_logo: "/team-logos/wcc/gonzaga.png",
        conference_id: "44444444-4444-4444-4444-444444444444",
        second_rounds: 16,
      }),
    ];
    mockGetTeamsWithMostSecondRoundsByYear.mockResolvedValue(expectedTeams);

    const result = await getTeamsInMostSecondRoundsByYear("year-uuid-1");

    expect(result).toEqual(expectedTeams);
  });

  it("should forward year id to the repository", async () => {
    mockGetTeamsWithMostSecondRoundsByYear.mockResolvedValue([]);

    await getTeamsInMostSecondRoundsByYear("specific-year-id");

    expect(mockGetTeamsWithMostSecondRoundsByYear).toHaveBeenCalledWith(
      "specific-year-id",
    );
    expect(mockGetTeamsWithMostSecondRoundsByYear).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no teams are found", async () => {
    mockGetTeamsWithMostSecondRoundsByYear.mockResolvedValue([]);

    const result = await getTeamsInMostSecondRoundsByYear("year-uuid-1");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return second round records with expected fields", async () => {
    const secondRoundTeam = buildTeamPerformance({
      team_id: "55555555-5555-5555-5555-555555555555",
      team_name: "Michigan",
      team_logo: "/team-logos/big-10/michigan.png",
      conference_id: "66666666-6666-6666-6666-666666666666",
      second_rounds: 15,
    });
    mockGetTeamsWithMostSecondRoundsByYear.mockResolvedValue([secondRoundTeam]);

    const result = await getTeamsInMostSecondRoundsByYear("year-uuid-1");

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe("55555555-5555-5555-5555-555555555555");
    expect(result[0].team_name).toBe("Michigan");
    expect(result[0].team_logo).toBe("/team-logos/big-10/michigan.png");
    expect(result[0].conference_id).toBe(
      "66666666-6666-6666-6666-666666666666",
    );
    expect(result[0].second_rounds).toBe(15);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetTeamsWithMostSecondRoundsByYear.mockRejectedValue(
      new Error("Failed to fetch teams with most second rounds: connection refused"),
    );

    await expect(getTeamsInMostSecondRoundsByYear("year-uuid-1")).rejects.toThrow(
      "Failed to fetch teams with most second rounds: connection refused",
    );
  });

  it("should propagate errors when no second round records are found", async () => {
    mockGetTeamsWithMostSecondRoundsByYear.mockRejectedValue(
      new Error("No teams with most second rounds found for year_id: year-uuid-1"),
    );

    await expect(getTeamsInMostSecondRoundsByYear("year-uuid-1")).rejects.toThrow(
      "No teams with most second rounds found for year_id: year-uuid-1",
    );
  });
});
