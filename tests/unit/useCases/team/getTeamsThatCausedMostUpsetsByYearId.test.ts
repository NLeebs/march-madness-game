import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTeamsThatCausedMostUpsetsByYearId } from "@/application/useCases";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTeamsWithMostUpsetsCausedByYear = vi.fn();

vi.mock("@/infrastructure/db/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    getTeamsWithMostUpsetsCausedByYear: mockGetTeamsWithMostUpsetsCausedByYear,
  })),
}));

describe("getTeamsThatCausedMostUpsetsByYearId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return teams that caused most upsets for a valid year id", async () => {
    const expectedTeams = [
      buildTeamPerformance({ upsets_caused: 6 }),
      buildTeamPerformance({
        team_id: "33333333-3333-3333-3333-333333333333",
        team_name: "Princeton",
        team_logo: "/team-logos/ivy/princeton.png",
        conference_id: "44444444-4444-4444-4444-444444444444",
        upsets_caused: 5,
      }),
    ];
    mockGetTeamsWithMostUpsetsCausedByYear.mockResolvedValue(expectedTeams);

    const result = await getTeamsThatCausedMostUpsetsByYearId("year-uuid-1");

    expect(result).toEqual(expectedTeams);
  });

  it("should forward year id to the repository", async () => {
    mockGetTeamsWithMostUpsetsCausedByYear.mockResolvedValue([]);

    await getTeamsThatCausedMostUpsetsByYearId("specific-year-id");

    expect(mockGetTeamsWithMostUpsetsCausedByYear).toHaveBeenCalledWith(
      "specific-year-id",
    );
    expect(mockGetTeamsWithMostUpsetsCausedByYear).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no teams are found", async () => {
    mockGetTeamsWithMostUpsetsCausedByYear.mockResolvedValue([]);

    const result = await getTeamsThatCausedMostUpsetsByYearId("year-uuid-1");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return upset records with expected fields", async () => {
    const upsetTeam = buildTeamPerformance({
      team_id: "55555555-5555-5555-5555-555555555555",
      team_name: "Florida Atlantic",
      team_logo: "/team-logos/cusa/fau.png",
      conference_id: "66666666-6666-6666-6666-666666666666",
      upsets_caused: 4,
    });
    mockGetTeamsWithMostUpsetsCausedByYear.mockResolvedValue([upsetTeam]);

    const result = await getTeamsThatCausedMostUpsetsByYearId("year-uuid-1");

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe("55555555-5555-5555-5555-555555555555");
    expect(result[0].team_name).toBe("Florida Atlantic");
    expect(result[0].team_logo).toBe("/team-logos/cusa/fau.png");
    expect(result[0].conference_id).toBe(
      "66666666-6666-6666-6666-666666666666",
    );
    expect(result[0].upsets_caused).toBe(4);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetTeamsWithMostUpsetsCausedByYear.mockRejectedValue(
      new Error("Failed to fetch teams with most upsets caused: connection refused"),
    );

    await expect(
      getTeamsThatCausedMostUpsetsByYearId("year-uuid-1"),
    ).rejects.toThrow(
      "Failed to fetch teams with most upsets caused: connection refused",
    );
  });

  it("should propagate errors when no upset records are found", async () => {
    mockGetTeamsWithMostUpsetsCausedByYear.mockRejectedValue(
      new Error("No teams with most upsets caused found for year_id: year-uuid-1"),
    );

    await expect(
      getTeamsThatCausedMostUpsetsByYearId("year-uuid-1"),
    ).rejects.toThrow(
      "No teams with most upsets caused found for year_id: year-uuid-1",
    );
  });
});
