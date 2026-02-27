import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/teams/appearances/second-rounds/[yearId]/route";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTeamsInMostSecondRoundsByYear = vi.fn();

vi.mock("@/application/useCases", () => ({
  getTeamsInMostSecondRoundsByYear: (...args: unknown[]) =>
    mockGetTeamsInMostSecondRoundsByYear(...args),
}));

function createRequest(yearId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/teams/appearances/second-rounds/${yearId}`,
    { method: "GET" },
  );
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/teams/appearances/second-rounds/[yearId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with teams in most second rounds for a valid year id", async () => {
      const mockTeams = [
        buildTeamPerformance({ second_rounds: 18 }),
        buildTeamPerformance({
          team_id: "33333333-3333-3333-3333-333333333333",
          team_name: "Baylor",
          conference_id: "44444444-4444-4444-4444-444444444444",
          second_rounds: 16,
        }),
      ];
      mockGetTeamsInMostSecondRoundsByYear.mockResolvedValue(mockTeams);

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockTeams);
    });

    it("should pass year id param to the use case", async () => {
      mockGetTeamsInMostSecondRoundsByYear.mockResolvedValue([]);

      await GET(createRequest("specific-year-id"), {
        params: { yearId: "specific-year-id" },
      });

      expect(mockGetTeamsInMostSecondRoundsByYear).toHaveBeenCalledWith(
        "specific-year-id",
      );
      expect(mockGetTeamsInMostSecondRoundsByYear).toHaveBeenCalledTimes(1);
    });

    it("should return 200 with an empty array when no teams are found", async () => {
      mockGetTeamsInMostSecondRoundsByYear.mockResolvedValue([]);

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
      mockGetTeamsInMostSecondRoundsByYear.mockRejectedValue(
        new Error("Failed to fetch teams with most second rounds: connection refused"),
      );

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe(
        "Failed to fetch teams with most second rounds: connection refused",
      );
    });

    it("should return error response with correct structure and path", async () => {
      mockGetTeamsInMostSecondRoundsByYear.mockRejectedValue(
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
            path: "/api/teams/appearances/second-rounds/test-year-id",
          }),
        }),
      );
    });

    it("should return 500 when no second round records are found", async () => {
      mockGetTeamsInMostSecondRoundsByYear.mockRejectedValue(
        new Error("No teams with most second rounds found for year_id: missing-year-id"),
      );

      const response = await GET(createRequest("missing-year-id"), {
        params: { yearId: "missing-year-id" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("No teams with most second rounds found");
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetTeamsInMostSecondRoundsByYear.mockResolvedValue([
        buildTeamPerformance(),
      ]);

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });
});
