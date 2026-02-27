import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTeamsInMostEliteEightsByYear } from "@/application/useCases";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTeamsWithMostEliteEightsByYear = vi.fn();

vi.mock("@/infrastructure/db/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    getTeamsWithMostEliteEightsByYear: mockGetTeamsWithMostEliteEightsByYear,
  })),
}));

describe("getTeamsInMostEliteEightsByYear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return teams in most elite eights for a valid year id", async () => {
    const expectedTeams = [
      buildTeamPerformance({ elite_eights: 11 }),
      buildTeamPerformance({
        team_id: "33333333-3333-3333-3333-333333333333",
        team_name: "Louisville",
        team_logo: "/team-logos/acc/louisville.png",
        conference_id: "44444444-4444-4444-4444-444444444444",
        elite_eights: 9,
      }),
    ];
    mockGetTeamsWithMostEliteEightsByYear.mockResolvedValue(expectedTeams);

    const result = await getTeamsInMostEliteEightsByYear("year-uuid-1");

    expect(result).toEqual(expectedTeams);
  });

  it("should forward year id to the repository", async () => {
    mockGetTeamsWithMostEliteEightsByYear.mockResolvedValue([]);

    await getTeamsInMostEliteEightsByYear("specific-year-id");

    expect(mockGetTeamsWithMostEliteEightsByYear).toHaveBeenCalledWith(
      "specific-year-id",
    );
    expect(mockGetTeamsWithMostEliteEightsByYear).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no teams are found", async () => {
    mockGetTeamsWithMostEliteEightsByYear.mockResolvedValue([]);

    const result = await getTeamsInMostEliteEightsByYear("year-uuid-1");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return elite eight records with expected fields", async () => {
    const eliteEightTeam = buildTeamPerformance({
      team_id: "55555555-5555-5555-5555-555555555555",
      team_name: "Michigan State",
      team_logo: "/team-logos/big-10/michigan-state.png",
      conference_id: "66666666-6666-6666-6666-666666666666",
      elite_eights: 10,
    });
    mockGetTeamsWithMostEliteEightsByYear.mockResolvedValue([eliteEightTeam]);

    const result = await getTeamsInMostEliteEightsByYear("year-uuid-1");

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe("55555555-5555-5555-5555-555555555555");
    expect(result[0].team_name).toBe("Michigan State");
    expect(result[0].team_logo).toBe("/team-logos/big-10/michigan-state.png");
    expect(result[0].conference_id).toBe(
      "66666666-6666-6666-6666-666666666666",
    );
    expect(result[0].elite_eights).toBe(10);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetTeamsWithMostEliteEightsByYear.mockRejectedValue(
      new Error("Failed to fetch teams with most elite eights: connection refused"),
    );

    await expect(getTeamsInMostEliteEightsByYear("year-uuid-1")).rejects.toThrow(
      "Failed to fetch teams with most elite eights: connection refused",
    );
  });

  it("should propagate errors when no elite eight records are found", async () => {
    mockGetTeamsWithMostEliteEightsByYear.mockRejectedValue(
      new Error("No teams with most elite eights found for year_id: year-uuid-1"),
    );

    await expect(getTeamsInMostEliteEightsByYear("year-uuid-1")).rejects.toThrow(
      "No teams with most elite eights found for year_id: year-uuid-1",
    );
  });
});
