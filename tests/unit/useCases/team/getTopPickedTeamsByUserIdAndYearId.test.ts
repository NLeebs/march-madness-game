import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTopPickedTeamsByUserIdAndYearId } from "@/application/useCases";
import { TeamPickCountSupabase } from "@/models/appStatsData/TeamPickCountSupabase";

const mockGetTopPickedTeamsByUserIdAndYearId = vi.fn();

vi.mock("@/infrastructure/db/PickRepository", () => ({
  PickRepository: vi.fn().mockImplementation(() => ({
    getTopPickedTeamsByUserIdAndYearId: mockGetTopPickedTeamsByUserIdAndYearId,
  })),
}));

function buildTeamPickCount(
  overrides: Partial<TeamPickCountSupabase> = {},
): TeamPickCountSupabase {
  return {
    team_id: "11111111-1111-1111-1111-111111111111",
    team_name: "Duke",
    team_logo: "/team-logos/acc/duke.png",
    conference_id: "22222222-2222-2222-2222-222222222222",
    pick_count: 42,
    ...overrides,
  };
}

describe("getTopPickedTeamsByUserIdAndYearId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return top picked teams for a valid userId and yearId", async () => {
    const expectedTeamCounts = [
      buildTeamPickCount(),
      buildTeamPickCount({
        team_id: "33333333-3333-3333-3333-333333333333",
        team_name: "Kansas",
        team_logo: "/team-logos/big-12/kansas.png",
        conference_id: "44444444-4444-4444-4444-444444444444",
        pick_count: 38,
      }),
    ];
    mockGetTopPickedTeamsByUserIdAndYearId.mockResolvedValue(
      expectedTeamCounts,
    );

    const result = await getTopPickedTeamsByUserIdAndYearId(
      "user-uuid-123",
      "year-uuid-1",
    );

    expect(result).toEqual(expectedTeamCounts);
  });

  it("should forward userId and yearId to the repository", async () => {
    mockGetTopPickedTeamsByUserIdAndYearId.mockResolvedValue([]);

    await getTopPickedTeamsByUserIdAndYearId(
      "specific-user-id",
      "specific-year-id",
    );

    expect(mockGetTopPickedTeamsByUserIdAndYearId).toHaveBeenCalledWith(
      "specific-user-id",
      "specific-year-id",
    );
    expect(mockGetTopPickedTeamsByUserIdAndYearId).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no picked teams exist", async () => {
    mockGetTopPickedTeamsByUserIdAndYearId.mockResolvedValue([]);

    const result = await getTopPickedTeamsByUserIdAndYearId(
      "user-uuid-123",
      "year-uuid-1",
    );

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should return team pick count records with expected fields", async () => {
    const topPickedTeam = buildTeamPickCount({
      team_id: "55555555-5555-5555-5555-555555555555",
      team_name: "UConn",
      team_logo: "/team-logos/big-east/uconn.png",
      conference_id: "66666666-6666-6666-6666-666666666666",
      pick_count: 77,
    });
    mockGetTopPickedTeamsByUserIdAndYearId.mockResolvedValue([topPickedTeam]);

    const result = await getTopPickedTeamsByUserIdAndYearId(
      "user-uuid-123",
      "year-uuid-1",
    );

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe("55555555-5555-5555-5555-555555555555");
    expect(result[0].team_name).toBe("UConn");
    expect(result[0].team_logo).toBe("/team-logos/big-east/uconn.png");
    expect(result[0].conference_id).toBe(
      "66666666-6666-6666-6666-666666666666",
    );
    expect(result[0].pick_count).toBe(77);
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetTopPickedTeamsByUserIdAndYearId.mockRejectedValue(
      new Error("Failed to fetch top picked teams: connection refused"),
    );

    await expect(
      getTopPickedTeamsByUserIdAndYearId("user-uuid-123", "year-uuid-1"),
    ).rejects.toThrow("Failed to fetch top picked teams: connection refused");
  });

  it("should propagate errors when no top picked teams are found", async () => {
    mockGetTopPickedTeamsByUserIdAndYearId.mockRejectedValue(
      new Error(
        "No top picked teams found for user_id: user-uuid-123 and year_id: year-uuid-1",
      ),
    );

    await expect(
      getTopPickedTeamsByUserIdAndYearId("user-uuid-123", "year-uuid-1"),
    ).rejects.toThrow(
      "No top picked teams found for user_id: user-uuid-123 and year_id: year-uuid-1",
    );
  });
});
