import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTopPickedTeamsByYear } from "@/application/useCases";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetMostPickedTeamsByYear = vi.fn();

vi.mock("@/infrastructure/db/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    getMostPickedTeamsByYear: mockGetMostPickedTeamsByYear,
  })),
}));

describe("getTopPickedTeamsByYear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return top picked teams for a valid year id", async () => {
    const expectedTeams = [
      buildTeamPerformance(),
      buildTeamPerformance({
        team_id: "33333333-3333-3333-3333-333333333333",
        team_name: "Purdue",
        team_logo: "/team-logos/big-10/purdue.png",
        conference_id: "44444444-4444-4444-4444-444444444444",
        picks: 151,
      }),
    ];
    mockGetMostPickedTeamsByYear.mockResolvedValue(expectedTeams);

    const result = await getTopPickedTeamsByYear("year-uuid-1");

    expect(result).toEqual(expectedTeams);
  });

  it("should forward year id to the repository", async () => {
    mockGetMostPickedTeamsByYear.mockResolvedValue([]);

    await getTopPickedTeamsByYear("specific-year-id");

    expect(mockGetMostPickedTeamsByYear).toHaveBeenCalledWith("specific-year-id");
    expect(mockGetMostPickedTeamsByYear).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no teams are found", async () => {
    mockGetMostPickedTeamsByYear.mockResolvedValue([]);

    const result = await getTopPickedTeamsByYear("year-uuid-1");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return team pick records with expected fields", async () => {
    const topPickedTeam = buildTeamPerformance({
      team_id: "55555555-5555-5555-5555-555555555555",
      team_name: "Houston",
      team_logo: "/team-logos/big-12/houston.png",
      conference_id: "66666666-6666-6666-6666-666666666666",
      picks: 187,
    });
    mockGetMostPickedTeamsByYear.mockResolvedValue([topPickedTeam]);

    const result = await getTopPickedTeamsByYear("year-uuid-1");

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe("55555555-5555-5555-5555-555555555555");
    expect(result[0].team_name).toBe("Houston");
    expect(result[0].team_logo).toBe("/team-logos/big-12/houston.png");
    expect(result[0].conference_id).toBe(
      "66666666-6666-6666-6666-666666666666",
    );
    expect(result[0].picks).toBe(187);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetMostPickedTeamsByYear.mockRejectedValue(
      new Error("Failed to fetch most picked teams: connection refused"),
    );

    await expect(getTopPickedTeamsByYear("year-uuid-1")).rejects.toThrow(
      "Failed to fetch most picked teams: connection refused",
    );
  });

  it("should propagate errors when no team pick records are found", async () => {
    mockGetMostPickedTeamsByYear.mockRejectedValue(
      new Error("No most picked teams found for year_id: year-uuid-1"),
    );

    await expect(getTopPickedTeamsByYear("year-uuid-1")).rejects.toThrow(
      "No most picked teams found for year_id: year-uuid-1",
    );
  });
});
