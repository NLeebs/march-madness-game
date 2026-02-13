import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/team-statistics/[yearId]/route";
import { buildConferenceMap } from "@/tests/factories";

const mockGetTeamStatisticsByYearId = vi.fn();

vi.mock("@/application/useCases/GetTeamStatisticsByYearId", () => ({
  getTeamStatisticsByYearId: (...args: unknown[]) =>
    mockGetTeamStatisticsByYearId(...args),
}));

function createRequest(yearId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/team-statistics/${yearId}`,
    { method: "GET" }
  );
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/team-statistics/[yearId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with team statistics", async () => {
      const mockStats = buildConferenceMap({
        acc: { Duke: {}, UNC: {} },
        bigTen: { Purdue: {} },
      });
      mockGetTeamStatisticsByYearId.mockResolvedValue(mockStats);

      const response = await GET(createRequest("year-uuid-123"), {
        params: { yearId: "year-uuid-123" },
      });

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockStats);
    });

    it("should pass the yearId param to the use case", async () => {
      mockGetTeamStatisticsByYearId.mockResolvedValue({});

      await GET(createRequest("specific-year-uuid"), {
        params: { yearId: "specific-year-uuid" },
      });

      expect(mockGetTeamStatisticsByYearId).toHaveBeenCalledWith(
        "specific-year-uuid"
      );
      expect(mockGetTeamStatisticsByYearId).toHaveBeenCalledTimes(1);
    });

    it("should return the full conference map structure", async () => {
      const mockStats = buildConferenceMap({
        acc: { Duke: { rpi: "0.90" } },
      });
      mockGetTeamStatisticsByYearId.mockResolvedValue(mockStats);

      const response = await GET(createRequest("year-uuid"), {
        params: { yearId: "year-uuid" },
      });

      const json = await parseResponse(response);
      expect(json.acc).toBeDefined();
      expect(json.acc.Duke).toBeDefined();
      expect(json.acc.Duke.name).toBe("Duke");
      expect(json.acc.Duke.rpi).toBe("0.90");
    });
  });

  describe("error handling", () => {
    it("should return 500 when the use case throws a generic error", async () => {
      mockGetTeamStatisticsByYearId.mockRejectedValue(
        new Error("Database connection failed")
      );

      const response = await GET(createRequest("year-uuid"), {
        params: { yearId: "year-uuid" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("Database connection failed");
    });

    it("should return error response with correct structure and path", async () => {
      mockGetTeamStatisticsByYearId.mockRejectedValue(
        new Error("Something broke")
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
            path: "/api/team-statistics/test-year-id",
          }),
        })
      );
    });

    it("should return 500 when year is not found in Supabase", async () => {
      mockGetTeamStatisticsByYearId.mockRejectedValue(
        new Error("No year found for id: nonexistent-uuid")
      );

      const response = await GET(createRequest("nonexistent-uuid"), {
        params: { yearId: "nonexistent-uuid" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("No year found");
    });

    it("should return 500 when Firebase team stats fetch fails", async () => {
      mockGetTeamStatisticsByYearId.mockRejectedValue(
        new Error("Error fetching team statistics by year from Firebase: 2025")
      );

      const response = await GET(createRequest("year-uuid"), {
        params: { yearId: "year-uuid" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("Error fetching team statistics");
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetTeamStatisticsByYearId.mockResolvedValue({});

      const response = await GET(createRequest("year-uuid"), {
        params: { yearId: "year-uuid" },
      });

      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );
    });

    it("should return empty object when no stats exist", async () => {
      mockGetTeamStatisticsByYearId.mockResolvedValue({});

      const response = await GET(createRequest("year-uuid"), {
        params: { yearId: "year-uuid" },
      });

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual({});
    });
  });
});
