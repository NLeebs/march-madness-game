import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/conference/[id]/route";
import { ConferenceSupabase } from "@/models/appStatsData";

const mockGetConferenceById = vi.fn();

vi.mock("@/application/useCases/GetConferenceById", () => ({
  getConferenceById: (...args: unknown[]) => mockGetConferenceById(...args),
}));

function createRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/conference/${id}`, {
    method: "GET",
  });
}

async function parseResponse(response: Response) {
  return response.json();
}

function buildConference(
  overrides: Partial<ConferenceSupabase> = {},
): ConferenceSupabase {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    conference: "Big East",
    conference_logo: "/conference-logos/big-east.png",
    created_at: "2025-03-20T10:00:00Z",
    ...overrides,
  };
}

describe("GET /api/conference/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with the conference", async () => {
      const mockConference = buildConference();
      mockGetConferenceById.mockResolvedValue(mockConference);

      const response = await GET(
        createRequest("11111111-1111-1111-1111-111111111111"),
        {
          params: { id: "11111111-1111-1111-1111-111111111111" },
        },
      );

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockConference);
    });

    it("should pass the id param to the use case", async () => {
      mockGetConferenceById.mockResolvedValue(buildConference());

      await GET(createRequest("specific-conference-id"), {
        params: { id: "specific-conference-id" },
      });

      expect(mockGetConferenceById).toHaveBeenCalledWith("specific-conference-id");
      expect(mockGetConferenceById).toHaveBeenCalledTimes(1);
    });

    it("should return all conference fields in the response", async () => {
      const conference = buildConference({
        id: "44444444-4444-4444-4444-444444444444",
        conference: "SEC",
        conference_logo: "/conference-logos/sec.png",
        created_at: "2025-03-15T12:00:00Z",
      });
      mockGetConferenceById.mockResolvedValue(conference);

      const response = await GET(
        createRequest("44444444-4444-4444-4444-444444444444"),
        {
          params: { id: "44444444-4444-4444-4444-444444444444" },
        },
      );

      const json = await parseResponse(response);
      expect(json.id).toBe("44444444-4444-4444-4444-444444444444");
      expect(json.conference).toBe("SEC");
      expect(json.conference_logo).toBe("/conference-logos/sec.png");
      expect(json.created_at).toBe("2025-03-15T12:00:00Z");
    });
  });

  describe("error handling", () => {
    it("should return 500 when the use case throws a generic error", async () => {
      mockGetConferenceById.mockRejectedValue(
        new Error("Failed to fetch conference: connection refused"),
      );

      const response = await GET(createRequest("conference-uuid"), {
        params: { id: "conference-uuid" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe(
        "Failed to fetch conference: connection refused",
      );
    });

    it("should return error response with correct structure and path", async () => {
      mockGetConferenceById.mockRejectedValue(new Error("Something broke"));

      const response = await GET(createRequest("test-conference-id"), {
        params: { id: "test-conference-id" },
      });

      const json = await parseResponse(response);
      expect(json).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.any(String),
            statusCode: expect.any(Number),
            timestamp: expect.any(String),
            path: "/api/conference/test-conference-id",
          }),
        }),
      );
    });

    it("should return 500 when no conference is found", async () => {
      mockGetConferenceById.mockRejectedValue(
        new Error("No conference found for id: nonexistent-id"),
      );

      const response = await GET(createRequest("nonexistent-id"), {
        params: { id: "nonexistent-id" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("No conference found");
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetConferenceById.mockResolvedValue(buildConference());

      const response = await GET(createRequest("conference-uuid"), {
        params: { id: "conference-uuid" },
      });

      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });
});
