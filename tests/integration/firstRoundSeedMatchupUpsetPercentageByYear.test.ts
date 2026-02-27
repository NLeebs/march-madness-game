import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/seeds/first-round/upset-percentage/[yearId]/route";
import { buildSeedPerformance } from "@/tests/factories";

const mockGetFirstRoundSeedMatchupUpsetPercentageByYearId = vi.fn();

vi.mock("@/application/useCases", () => ({
  getFirstRoundSeedMatchupUpsetPercentageByYearId: (...args: unknown[]) =>
    mockGetFirstRoundSeedMatchupUpsetPercentageByYearId(...args),
}));

function createRequest(yearId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/seeds/first-round/upset-percentage/${yearId}`,
    { method: "GET" },
  );
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/seeds/first-round/upset-percentage/[yearId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with first round seed matchup upset percentages for a valid year id", async () => {
      const mockSeedPerformance = [
        buildSeedPerformance(),
        buildSeedPerformance({
          higher_seed: 6,
          lower_seed: 11,
          upset_percentage: 37.8,
        }),
      ];
      mockGetFirstRoundSeedMatchupUpsetPercentageByYearId.mockResolvedValue(
        mockSeedPerformance,
      );

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockSeedPerformance);
    });

    it("should pass year id param to the use case", async () => {
      mockGetFirstRoundSeedMatchupUpsetPercentageByYearId.mockResolvedValue([]);

      await GET(createRequest("specific-year-id"), {
        params: { yearId: "specific-year-id" },
      });

      expect(
        mockGetFirstRoundSeedMatchupUpsetPercentageByYearId,
      ).toHaveBeenCalledWith("specific-year-id");
      expect(
        mockGetFirstRoundSeedMatchupUpsetPercentageByYearId,
      ).toHaveBeenCalledTimes(1);
    });

    it("should return 200 with an empty array when no records are found", async () => {
      mockGetFirstRoundSeedMatchupUpsetPercentageByYearId.mockResolvedValue([]);

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
      mockGetFirstRoundSeedMatchupUpsetPercentageByYearId.mockRejectedValue(
        new Error("Failed to fetch seed performance: connection refused"),
      );

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe(
        "Failed to fetch seed performance: connection refused",
      );
    });

    it("should return error response with correct structure and path", async () => {
      mockGetFirstRoundSeedMatchupUpsetPercentageByYearId.mockRejectedValue(
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
            path: "/api/seeds/first-round/upset-percentage/test-year-id",
          }),
        }),
      );
    });

    it("should return 500 when no seed performance records are found", async () => {
      mockGetFirstRoundSeedMatchupUpsetPercentageByYearId.mockRejectedValue(
        new Error("No seed performance found for year_id: missing-year-id"),
      );

      const response = await GET(createRequest("missing-year-id"), {
        params: { yearId: "missing-year-id" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("No seed performance found");
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetFirstRoundSeedMatchupUpsetPercentageByYearId.mockResolvedValue([
        buildSeedPerformance(),
      ]);

      const response = await GET(createRequest("year-uuid-1"), {
        params: { yearId: "year-uuid-1" },
      });

      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });
});
