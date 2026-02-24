import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/pick-count/[userId]/[yearId]/route";
import { TeamPickCountSupabase } from "@/models/appStatsData/TeamPickCountSupabase";

const mockGetTopPickedTeamsByUserIdAndYearId = vi.fn();

vi.mock("@/application/useCases/GetTopPickedTeamsByUserIdAndYearId", () => ({
  getTopPickedTeamsByUserIdAndYearId: (...args: unknown[]) =>
    mockGetTopPickedTeamsByUserIdAndYearId(...args),
}));

function createRequest(userId: string, yearId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/pick-count/${userId}/${yearId}`,
    { method: "GET" },
  );
}

async function parseResponse(response: Response) {
  return response.json();
}

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

describe("GET /api/pick-count/[userId]/[yearId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with top picked teams for a valid userId and yearId", async () => {
      const mockTeamPickCounts = [
        buildTeamPickCount(),
        buildTeamPickCount({
          team_id: "33333333-3333-3333-3333-333333333333",
          team_name: "Kansas",
          team_logo: "/team-logos/big-12/kansas.png",
          conference_id: "44444444-4444-4444-4444-444444444444",
          pick_count: 38,
        }),
      ];
      mockGetTopPickedTeamsByUserIdAndYearId.mockResolvedValue(mockTeamPickCounts);

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } },
      );

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockTeamPickCounts);
    });

    it("should pass both userId and yearId params to the use case", async () => {
      mockGetTopPickedTeamsByUserIdAndYearId.mockResolvedValue([]);

      await GET(createRequest("specific-user", "specific-year"), {
        params: { userId: "specific-user", yearId: "specific-year" },
      });

      expect(mockGetTopPickedTeamsByUserIdAndYearId).toHaveBeenCalledWith(
        "specific-user",
        "specific-year",
      );
      expect(mockGetTopPickedTeamsByUserIdAndYearId).toHaveBeenCalledTimes(1);
    });

    it("should return 200 with an empty array when no picks exist", async () => {
      mockGetTopPickedTeamsByUserIdAndYearId.mockResolvedValue([]);

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } },
      );

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual([]);
    });

    it("should return all team pick count fields in the response", async () => {
      const topPickedTeam = buildTeamPickCount({
        team_id: "55555555-5555-5555-5555-555555555555",
        team_name: "UConn",
        team_logo: "/team-logos/big-east/uconn.png",
        conference_id: "66666666-6666-6666-6666-666666666666",
        pick_count: 77,
      });
      mockGetTopPickedTeamsByUserIdAndYearId.mockResolvedValue([topPickedTeam]);

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } },
      );

      const json = await parseResponse(response);
      expect(json).toHaveLength(1);
      expect(json[0].team_id).toBe("55555555-5555-5555-5555-555555555555");
      expect(json[0].team_name).toBe("UConn");
      expect(json[0].team_logo).toBe("/team-logos/big-east/uconn.png");
      expect(json[0].conference_id).toBe(
        "66666666-6666-6666-6666-666666666666",
      );
      expect(json[0].pick_count).toBe(77);
    });

    it("should return teams sorted by pick count when provided", async () => {
      const teamPickCounts = [
        buildTeamPickCount({ team_name: "Team A", pick_count: 100 }),
        buildTeamPickCount({
          team_id: "77777777-7777-7777-7777-777777777777",
          team_name: "Team B",
          pick_count: 91,
        }),
        buildTeamPickCount({
          team_id: "88888888-8888-8888-8888-888888888888",
          team_name: "Team C",
          pick_count: 78,
        }),
      ];
      mockGetTopPickedTeamsByUserIdAndYearId.mockResolvedValue(teamPickCounts);

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } },
      );

      const json = await parseResponse(response);
      expect(json).toHaveLength(3);
      expect(json.map((team: TeamPickCountSupabase) => team.pick_count)).toEqual([
        100, 91, 78,
      ]);
    });
  });

  describe("error handling", () => {
    it("should return 500 when the use case throws a generic error", async () => {
      mockGetTopPickedTeamsByUserIdAndYearId.mockRejectedValue(
        new Error("Failed to fetch top picked teams: connection refused"),
      );

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } },
      );

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe(
        "Failed to fetch top picked teams: connection refused",
      );
    });

    it("should return error response with correct structure and path", async () => {
      mockGetTopPickedTeamsByUserIdAndYearId.mockRejectedValue(
        new Error("Something broke"),
      );

      const response = await GET(
        createRequest("test-user-id", "test-year-id"),
        { params: { userId: "test-user-id", yearId: "test-year-id" } },
      );

      const json = await parseResponse(response);
      expect(json).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.any(String),
            statusCode: expect.any(Number),
            timestamp: expect.any(String),
            path: "/api/pick-count/test-user-id/test-year-id",
          }),
        }),
      );
    });

    it("should return 500 when no pick count records are found", async () => {
      mockGetTopPickedTeamsByUserIdAndYearId.mockRejectedValue(
        new Error(
          "No top picked teams found for user_id: user-uuid-123 and year_id: year-uuid-1",
        ),
      );

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } },
      );

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("No top picked teams found");
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetTopPickedTeamsByUserIdAndYearId.mockResolvedValue([
        buildTeamPickCount(),
      ]);

      const response = await GET(
        createRequest("user-uuid-123", "year-uuid-1"),
        { params: { userId: "user-uuid-123", yearId: "year-uuid-1" } },
      );

      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });
});
