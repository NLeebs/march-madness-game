import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/teams/appearances/championships/[yearId]/route";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTeamsWithMostChampionshipsByYear = vi.fn();

vi.mock("@/application/useCases", () => ({
  getTeamsWithMostChampionshipsByYear: (...args: unknown[]) =>
    mockGetTeamsWithMostChampionshipsByYear(...args),
}));

function createRequest(yearId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/teams/appearances/championships/${yearId}`,
    { method: "GET" },
  );
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/teams/appearances/championships/[yearId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with teams with most championships for a valid year id", async () => {
      const mockTeams = [
        buildTeamPerformance({ championships: 3 }),
        buildTeamPerformance({
          team_id: "33333333-3333-3333-3333-333333333333",
          team_name: "Kentucky",
          conference_id: "44444444-4444-4444-4444-444444444444",
          championships: 2,
        }),
      ];
      mockGetTeamsWithMostChampionshipsByYear.mockResolvedValue(mockTeams);

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockTeams);
    });

    it("should pass year id param to the use case", async () => {
      mockGetTeamsWithMostChampionshipsByYear.mockResolvedValue([]);

      await GET(createRequest("specific-year-id"), {
        params: { yearId: "specific-year-id" },
      });

      expect(mockGetTeamsWithMostChampionshipsByYear).toHaveBeenCalledWith(
        "specific-year-id",
      );
      expect(mockGetTeamsWithMostChampionshipsByYear).toHaveBeenCalledTimes(1);
    });

    it("should return 200 with an empty array when no teams are found", async () => {
      mockGetTeamsWithMostChampionshipsByYear.mockResolvedValue([]);

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should return 500 when the use case throws a generic error", async () => {
      mockGetTeamsWithMostChampionshipsByYear.mockRejectedValue(
        new Error("Failed to fetch teams with most championships: connection refused"),
      );

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe(
        "Failed to fetch teams with most championships: connection refused",
      );
    });

    it("should return error response with correct structure and path", async () => {
      mockGetTeamsWithMostChampionshipsByYear.mockRejectedValue(
        new Error("Something broke"),
      );

      const response = await GET(createRequest("test-year-id"), {
        params: { yearId: "test-year-id" },
      });

      const json = await parseResponse(response);
      expect(json).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.any(String),
            statusCode: expect.any(Number),
            timestamp: expect.any(String),
            path: "/api/teams/appearances/championships/test-year-id",
          }),
        }),
      );
    });

    it("should return 500 when no championship records are found", async () => {
      mockGetTeamsWithMostChampionshipsByYear.mockRejectedValue(
        new Error("No teams with most championships found for year_id: missing-year-id"),
      );

      const response = await GET(createRequest("missing-year-id"), {
        params: { yearId: "missing-year-id" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("No teams with most championships found");
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetTeamsWithMostChampionshipsByYear.mockResolvedValue([
        buildTeamPerformance(),
      ]);

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });
});
