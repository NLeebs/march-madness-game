import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTeamById } from "@/application/useCases";
import { buildTeam } from "@/tests/factories";

const mockGetTeamById = vi.fn();

vi.mock("@/infrastructure/db/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    getTeamById: mockGetTeamById,
  })),
}));

describe("getTeamById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a team for a valid id", async () => {
    const expectedTeam = buildTeam();
    mockGetTeamById.mockResolvedValue(expectedTeam);

    const result = await getTeamById("11111111-1111-1111-1111-111111111111");

    expect(result).toEqual(expectedTeam);
  });

  it("should forward the id to the repository", async () => {
    mockGetTeamById.mockResolvedValue(buildTeam());

    await getTeamById("specific-team-id");

    expect(mockGetTeamById).toHaveBeenCalledWith("specific-team-id");
    expect(mockGetTeamById).toHaveBeenCalledTimes(1);
  });

  it("should return the team with all expected fields", async () => {
    const team = buildTeam({
      id: "44444444-4444-4444-4444-444444444444",
      name: "Gonzaga",
      year_id: "55555555-5555-5555-5555-555555555555",
      conference_id: "66666666-6666-6666-6666-666666666666",
      team_logo: "/team-logos/wcc/gonzaga.png",
      created_at: "2025-02-01T00:00:00Z",
    });
    mockGetTeamById.mockResolvedValue(team);

    const result = await getTeamById("44444444-4444-4444-4444-444444444444");

    expect(result.id).toBe("44444444-4444-4444-4444-444444444444");
    expect(result.name).toBe("Gonzaga");
    expect(result.year_id).toBe("55555555-5555-5555-5555-555555555555");
    expect(result.conference_id).toBe("66666666-6666-6666-6666-666666666666");
    expect(result.team_logo).toBe("/team-logos/wcc/gonzaga.png");
    expect(result.created_at).toBe("2025-02-01T00:00:00Z");
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetTeamById.mockRejectedValue(
      new Error("Failed to fetch team: connection refused"),
    );

    await expect(getTeamById("team-uuid-123")).rejects.toThrow(
      "Failed to fetch team: connection refused",
    );
  });

  it("should propagate errors when no team is found", async () => {
    mockGetTeamById.mockRejectedValue(
      new Error("No team found for id: nonexistent-id"),
    );

    await expect(getTeamById("nonexistent-id")).rejects.toThrow(
      "No team found for id: nonexistent-id",
    );
  });
});
