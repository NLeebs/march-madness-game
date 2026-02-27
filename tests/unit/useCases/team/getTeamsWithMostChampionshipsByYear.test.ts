import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTeamsWithMostChampionshipsByYear } from "@/application/useCases";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTeamsWithMostChampionshipsByYear = vi.fn();

vi.mock("@/infrastructure/db/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    getTeamsWithMostChampionshipsByYear: mockGetTeamsWithMostChampionshipsByYear,
  })),
}));

describe("getTeamsWithMostChampionshipsByYear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return teams with most championships for a valid year id", async () => {
    const expectedTeams = [
      buildTeamPerformance({ championships: 3 }),
      buildTeamPerformance({
        team_id: "33333333-3333-3333-3333-333333333333",
        team_name: "UConn",
        team_logo: "/team-logos/big-east/uconn.png",
        conference_id: "44444444-4444-4444-4444-444444444444",
        championships: 2,
      }),
    ];
    mockGetTeamsWithMostChampionshipsByYear.mockResolvedValue(expectedTeams);

    const result = await getTeamsWithMostChampionshipsByYear("year-uuid-1");

    expect(result).toEqual(expectedTeams);
  });

  it("should forward year id to the repository", async () => {
    mockGetTeamsWithMostChampionshipsByYear.mockResolvedValue([]);

    await getTeamsWithMostChampionshipsByYear("specific-year-id");

    expect(mockGetTeamsWithMostChampionshipsByYear).toHaveBeenCalledWith(
      "specific-year-id",
    );
    expect(mockGetTeamsWithMostChampionshipsByYear).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no teams are found", async () => {
    mockGetTeamsWithMostChampionshipsByYear.mockResolvedValue([]);

    const result = await getTeamsWithMostChampionshipsByYear("year-uuid-1");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return championship records with expected fields", async () => {
    const championshipTeam = buildTeamPerformance({
      team_id: "55555555-5555-5555-5555-555555555555",
      team_name: "Duke",
      team_logo: "/team-logos/acc/duke.png",
      conference_id: "66666666-6666-6666-6666-666666666666",
      championships: 5,
    });
    mockGetTeamsWithMostChampionshipsByYear.mockResolvedValue([championshipTeam]);

    const result = await getTeamsWithMostChampionshipsByYear("year-uuid-1");

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe("55555555-5555-5555-5555-555555555555");
    expect(result[0].team_name).toBe("Duke");
    expect(result[0].team_logo).toBe("/team-logos/acc/duke.png");
    expect(result[0].conference_id).toBe(
      "66666666-6666-6666-6666-666666666666",
    );
    expect(result[0].championships).toBe(5);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetTeamsWithMostChampionshipsByYear.mockRejectedValue(
      new Error("Failed to fetch teams with most championships: connection refused"),
    );

    await expect(getTeamsWithMostChampionshipsByYear("year-uuid-1")).rejects.toThrow(
      "Failed to fetch teams with most championships: connection refused",
    );
  });

  it("should propagate errors when no championship records are found", async () => {
    mockGetTeamsWithMostChampionshipsByYear.mockRejectedValue(
      new Error("No teams with most championships found for year_id: year-uuid-1"),
    );

    await expect(getTeamsWithMostChampionshipsByYear("year-uuid-1")).rejects.toThrow(
      "No teams with most championships found for year_id: year-uuid-1",
    );
  });
});
