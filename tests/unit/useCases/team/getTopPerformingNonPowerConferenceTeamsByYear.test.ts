import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTopPerformingNonPowerConferenceTeamsByYear } from "@/application/useCases";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTopPerformingNonPowerConferenceTeamsByYear = vi.fn();

vi.mock("@/infrastructure/db/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    getTopPerformingNonPowerConferenceTeamsByYear:
      mockGetTopPerformingNonPowerConferenceTeamsByYear,
  })),
}));

describe("getTopPerformingNonPowerConferenceTeamsByYear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return non power conference top performing teams for a valid year id", async () => {
    const expectedTeams = [
      buildTeamPerformance(),
      buildTeamPerformance({
        team_id: "33333333-3333-3333-3333-333333333333",
        team_name: "Gonzaga",
        team_logo: "/team-logos/wcc/gonzaga.png",
        conference_id: "44444444-4444-4444-4444-444444444444",
        tournament_points_scored: 139,
      }),
    ];
    mockGetTopPerformingNonPowerConferenceTeamsByYear.mockResolvedValue(
      expectedTeams,
    );

    const result =
      await getTopPerformingNonPowerConferenceTeamsByYear("year-uuid-1");

    expect(result).toEqual(expectedTeams);
  });

  it("should forward year id to the repository", async () => {
    mockGetTopPerformingNonPowerConferenceTeamsByYear.mockResolvedValue([]);

    await getTopPerformingNonPowerConferenceTeamsByYear("specific-year-id");

    expect(
      mockGetTopPerformingNonPowerConferenceTeamsByYear,
    ).toHaveBeenCalledWith("specific-year-id");
    expect(
      mockGetTopPerformingNonPowerConferenceTeamsByYear,
    ).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no teams are found", async () => {
    mockGetTopPerformingNonPowerConferenceTeamsByYear.mockResolvedValue([]);

    const result =
      await getTopPerformingNonPowerConferenceTeamsByYear("year-uuid-1");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return team performance records with expected fields", async () => {
    const topPerformingTeam = buildTeamPerformance({
      team_id: "55555555-5555-5555-5555-555555555555",
      team_name: "Saint Mary's",
      team_logo: "/team-logos/wcc/saint-marys.png",
      conference_id: "66666666-6666-6666-6666-666666666666",
      championships: 1,
      finals: 2,
    });
    mockGetTopPerformingNonPowerConferenceTeamsByYear.mockResolvedValue([
      topPerformingTeam,
    ]);

    const result =
      await getTopPerformingNonPowerConferenceTeamsByYear("year-uuid-1");

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe("55555555-5555-5555-5555-555555555555");
    expect(result[0].team_name).toBe("Saint Mary's");
    expect(result[0].team_logo).toBe("/team-logos/wcc/saint-marys.png");
    expect(result[0].conference_id).toBe(
      "66666666-6666-6666-6666-666666666666",
    );
    expect(result[0].championships).toBe(1);
    expect(result[0].finals).toBe(2);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetTopPerformingNonPowerConferenceTeamsByYear.mockRejectedValue(
      new Error(
        "Failed to fetch top performing non power conference teams: connection refused",
      ),
    );

    await expect(
      getTopPerformingNonPowerConferenceTeamsByYear("year-uuid-1"),
    ).rejects.toThrow(
      "Failed to fetch top performing non power conference teams: connection refused",
    );
  });

  it("should propagate errors when no team performance records are found", async () => {
    mockGetTopPerformingNonPowerConferenceTeamsByYear.mockRejectedValue(
      new Error(
        "No top performing teams found for non-power conferences and year_id: year-uuid-1",
      ),
    );

    await expect(
      getTopPerformingNonPowerConferenceTeamsByYear("year-uuid-1"),
    ).rejects.toThrow(
      "No top performing teams found for non-power conferences and year_id: year-uuid-1",
    );
  });
});
