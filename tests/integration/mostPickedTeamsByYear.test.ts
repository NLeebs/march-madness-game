import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/teams/most-picked/[yearId]/route";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTopPickedTeamsByYear = vi.fn();

vi.mock("@/application/useCases", () => ({
  getTopPickedTeamsByYear: (...args: unknown[]) =>
    mockGetTopPickedTeamsByYear(...args),
}));

function createRequest(yearId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/teams/most-picked/${yearId}`,
    { method: "GET" },
  );
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/teams/most-picked/[yearId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with most picked teams for a valid year id", async () => {
      const mockTeams = [
        buildTeamPerformance({ picks: 195 }),
        buildTeamPerformance({
          team_id: "33333333-3333-3333-3333-333333333333",
          team_name: "Kansas",
          conference_id: "44444444-4444-4444-4444-444444444444",
          picks: 182,
        }),
      ];
      mockGetTopPickedTeamsByYear.mockResolvedValue(mockTeams);

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockTeams);
    });

    it("should pass year id param to the use case", async () => {
      mockGetTopPickedTeamsByYear.mockResolvedValue([]);

      await GET(createRequest("specific-year-id"), {
        params: { yearId: "specific-year-id" },
      });

      expect(mockGetTopPickedTeamsByYear).toHaveBeenCalledWith(
        "specific-year-id",
      );
      expect(mockGetTopPickedTeamsByYear).toHaveBeenCalledTimes(1);
    });

    it("should return 200 with an empty array when no teams are found", async () => {
      mockGetTopPickedTeamsByYear.mockResolvedValue([]);

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
      mockGetTopPickedTeamsByYear.mockRejectedValue(
        new Error("Failed to fetch most picked teams: connection refused"),
      );

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe(
        "Failed to fetch most picked teams: connection refused",
      );
    });

    it("should return error response with correct structure and path", async () => {
      mockGetTopPickedTeamsByYear.mockRejectedValue(new Error("Something broke"));

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
            path: "/api/teams/most-picked/test-year-id",
          }),
        }),
      );
    });

    it("should return 500 when no team pick records are found", async () => {
      mockGetTopPickedTeamsByYear.mockRejectedValue(
        new Error("No most picked teams found for year_id: missing-year-id"),
      );

      const response = await GET(createRequest("missing-year-id"), {
        params: { yearId: "missing-year-id" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("No most picked teams found");
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetTopPickedTeamsByYear.mockResolvedValue([buildTeamPerformance()]);

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });
});
