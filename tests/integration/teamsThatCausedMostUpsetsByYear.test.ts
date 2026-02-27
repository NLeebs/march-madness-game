import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/teams/upsets/caused/[yearId]/route";
import { buildTeamPerformance } from "@/tests/factories";

const mockGetTeamsThatCausedMostUpsetsByYearId = vi.fn();

vi.mock("@/application/useCases", () => ({
  getTeamsThatCausedMostUpsetsByYearId: (...args: unknown[]) =>
    mockGetTeamsThatCausedMostUpsetsByYearId(...args),
}));

function createRequest(yearId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/teams/upsets/caused/${yearId}`,
    { method: "GET" },
  );
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/teams/upsets/caused/[yearId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with teams that caused most upsets for a valid year id", async () => {
      const mockTeams = [
        buildTeamPerformance({ team_name: "Princeton", upsets_caused: 5 }),
        buildTeamPerformance({
          team_id: "33333333-3333-3333-3333-333333333333",
          team_name: "Oral Roberts",
          conference_id: "44444444-4444-4444-4444-444444444444",
          upsets_caused: 4,
        }),
      ];
      mockGetTeamsThatCausedMostUpsetsByYearId.mockResolvedValue(mockTeams);

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockTeams);
    });

    it("should pass year id param to the use case", async () => {
      mockGetTeamsThatCausedMostUpsetsByYearId.mockResolvedValue([]);

      await GET(createRequest("specific-year-id"), {
        params: { yearId: "specific-year-id" },
      });

      expect(mockGetTeamsThatCausedMostUpsetsByYearId).toHaveBeenCalledWith(
        "specific-year-id",
      );
      expect(mockGetTeamsThatCausedMostUpsetsByYearId).toHaveBeenCalledTimes(1);
    });

    it("should return 200 with an empty array when no teams are found", async () => {
      mockGetTeamsThatCausedMostUpsetsByYearId.mockResolvedValue([]);

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
      mockGetTeamsThatCausedMostUpsetsByYearId.mockRejectedValue(
        new Error("Failed to fetch teams with most upsets caused: connection refused"),
      );

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe(
        "Failed to fetch teams with most upsets caused: connection refused",
      );
    });

    it("should return error response with correct structure and path", async () => {
      mockGetTeamsThatCausedMostUpsetsByYearId.mockRejectedValue(
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
            path: "/api/teams/upsets/caused/test-year-id",
          }),
        }),
      );
    });

    it("should return 500 when no upset records are found", async () => {
      mockGetTeamsThatCausedMostUpsetsByYearId.mockRejectedValue(
        new Error(
          "No teams with most upsets caused found for year_id: missing-year-id",
        ),
      );

      const response = await GET(createRequest("missing-year-id"), {
        params: { yearId: "missing-year-id" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain(
        "No teams with most upsets caused found",
      );
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetTeamsThatCausedMostUpsetsByYearId.mockResolvedValue([
        buildTeamPerformance(),
      ]);

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });
});
