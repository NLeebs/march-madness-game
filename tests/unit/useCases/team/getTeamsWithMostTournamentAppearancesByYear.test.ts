import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTeamsWithMostTournamentAppearancesByYear } from "@/application/useCases";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTeamsWithMostTournamentAppearancesByYear = vi.fn();

vi.mock("@/infrastructure/db/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    getTeamsWithMostTournamentAppearancesByYear:
      mockGetTeamsWithMostTournamentAppearancesByYear,
  })),
}));

describe("getTeamsWithMostTournamentAppearancesByYear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return teams with most tournament appearances for a valid year id", async () => {
    const expectedTeams = [
      buildTeamPerformance({ tournament_appearances: 24 }),
      buildTeamPerformance({
        team_id: "33333333-3333-3333-3333-333333333333",
        team_name: "Kansas",
        team_logo: "/team-logos/big-12/kansas.png",
        conference_id: "44444444-4444-4444-4444-444444444444",
        tournament_appearances: 22,
      }),
    ];
    mockGetTeamsWithMostTournamentAppearancesByYear.mockResolvedValue(
      expectedTeams,
    );

    const result = await getTeamsWithMostTournamentAppearancesByYear(
      "year-uuid-1",
    );

    expect(result).toEqual(expectedTeams);
  });

  it("should forward year id to the repository", async () => {
    mockGetTeamsWithMostTournamentAppearancesByYear.mockResolvedValue([]);

    await getTeamsWithMostTournamentAppearancesByYear("specific-year-id");

    expect(mockGetTeamsWithMostTournamentAppearancesByYear).toHaveBeenCalledWith(
      "specific-year-id",
    );
    expect(mockGetTeamsWithMostTournamentAppearancesByYear).toHaveBeenCalledTimes(
      1,
    );
  });

  it("should return an empty array when no teams are found", async () => {
    mockGetTeamsWithMostTournamentAppearancesByYear.mockResolvedValue([]);

    const result = await getTeamsWithMostTournamentAppearancesByYear(
      "year-uuid-1",
    );

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return tournament appearance records with expected fields", async () => {
    const appearanceTeam = buildTeamPerformance({
      team_id: "55555555-5555-5555-5555-555555555555",
      team_name: "Duke",
      team_logo: "/team-logos/acc/duke.png",
      conference_id: "66666666-6666-6666-6666-666666666666",
      tournament_appearances: 26,
    });
    mockGetTeamsWithMostTournamentAppearancesByYear.mockResolvedValue([
      appearanceTeam,
    ]);

    const result = await getTeamsWithMostTournamentAppearancesByYear(
      "year-uuid-1",
    );

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe("55555555-5555-5555-5555-555555555555");
    expect(result[0].team_name).toBe("Duke");
    expect(result[0].team_logo).toBe("/team-logos/acc/duke.png");
    expect(result[0].conference_id).toBe(
      "66666666-6666-6666-6666-666666666666",
    );
    expect(result[0].tournament_appearances).toBe(26);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetTeamsWithMostTournamentAppearancesByYear.mockRejectedValue(
      new Error(
        "Failed to fetch teams with most tournament appearances: connection refused",
      ),
    );

    await expect(
      getTeamsWithMostTournamentAppearancesByYear("year-uuid-1"),
    ).rejects.toThrow(
      "Failed to fetch teams with most tournament appearances: connection refused",
    );
  });

  it("should propagate errors when no appearance records are found", async () => {
    mockGetTeamsWithMostTournamentAppearancesByYear.mockRejectedValue(
      new Error(
        "No teams with most tournament appearances found for year_id: year-uuid-1",
      ),
    );

    await expect(
      getTeamsWithMostTournamentAppearancesByYear("year-uuid-1"),
    ).rejects.toThrow(
      "No teams with most tournament appearances found for year_id: year-uuid-1",
    );
  });
});
