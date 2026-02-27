import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/teams/appearances/sweet-sixteens/[yearId]/route";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTeamsInMostSweetSixteensByYear = vi.fn();

vi.mock("@/application/useCases", () => ({
  getTeamsInMostSweetSixteensByYear: (...args: unknown[]) =>
    mockGetTeamsInMostSweetSixteensByYear(...args),
}));

function createRequest(yearId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/teams/appearances/sweet-sixteens/${yearId}`,
    { method: "GET" },
  );
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/teams/appearances/sweet-sixteens/[yearid]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with teams in most sweet sixteens for a valid year id", async () => {
      const mockTeams = [
        buildTeamPerformance({ sweet_sixteens: 14 }),
        buildTeamPerformance({
          team_id: "33333333-3333-3333-3333-333333333333",
          team_name: "Tennessee",
          conference_id: "44444444-4444-4444-4444-444444444444",
          sweet_sixteens: 11,
        }),
      ];
      mockGetTeamsInMostSweetSixteensByYear.mockResolvedValue(mockTeams);

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockTeams);
    });

    it("should pass year id param to the use case", async () => {
      mockGetTeamsInMostSweetSixteensByYear.mockResolvedValue([]);

      await GET(createRequest("specific-year-id"), {
        params: { yearId: "specific-year-id" },
      });

      expect(mockGetTeamsInMostSweetSixteensByYear).toHaveBeenCalledWith(
        "specific-year-id",
      );
      expect(mockGetTeamsInMostSweetSixteensByYear).toHaveBeenCalledTimes(1);
    });

    it("should return 200 with an empty array when no teams are found", async () => {
      mockGetTeamsInMostSweetSixteensByYear.mockResolvedValue([]);

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
      mockGetTeamsInMostSweetSixteensByYear.mockRejectedValue(
        new Error(
          "Failed to fetch teams with most sweet sixteens: connection refused",
        ),
      );

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe(
        "Failed to fetch teams with most sweet sixteens: connection refused",
      );
    });

    it("should return error response with correct structure and path", async () => {
      mockGetTeamsInMostSweetSixteensByYear.mockRejectedValue(
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
            path: "/api/teams/appearances/sweet-sixteens/test-year-id",
          }),
        }),
      );
    });

    it("should return 500 when no sweet sixteen records are found", async () => {
      mockGetTeamsInMostSweetSixteensByYear.mockRejectedValue(
        new Error(
          "No teams with most sweet sixteens found for year_id: missing-year-id",
        ),
      );

      const response = await GET(createRequest("missing-year-id"), {
        params: { yearId: "missing-year-id" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain(
        "No teams with most sweet sixteens found",
      );
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetTeamsInMostSweetSixteensByYear.mockResolvedValue([
        buildTeamPerformance(),
      ]);

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
    });
  });
});
