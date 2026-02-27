import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/team/[id]/route";
import { buildTeam } from "@/tests/factories";

const mockGetTeamById = vi.fn();

vi.mock("@/application/useCases", () => ({
  getTeamById: (...args: unknown[]) => mockGetTeamById(...args),
}));

function createRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/team/${id}`, {
    method: "GET",
  });
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/team/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return 200 with the team", async () => {
      const mockTeam = buildTeam();
      mockGetTeamById.mockResolvedValue(mockTeam);

      const response = await GET(
        createRequest("11111111-1111-1111-1111-111111111111"),
        {
          params: { id: "11111111-1111-1111-1111-111111111111" },
        },
      );

      expect(response.status).toBe(200);
      const json = await parseResponse(response);
      expect(json).toEqual(mockTeam);
    });

    it("should pass the id param to the use case", async () => {
      mockGetTeamById.mockResolvedValue(buildTeam());

      await GET(createRequest("specific-team-id"), {
        params: { id: "specific-team-id" },
      });

      expect(mockGetTeamById).toHaveBeenCalledWith("specific-team-id");
      expect(mockGetTeamById).toHaveBeenCalledTimes(1);
    });

    it("should return all team fields in the response", async () => {
      const team = buildTeam({
        id: "44444444-4444-4444-4444-444444444444",
        name: "Purdue",
        year_id: "55555555-5555-5555-5555-555555555555",
        conference_id: "66666666-6666-6666-6666-666666666666",
        team_logo: "/team-logos/bigTen/purdue.png",
        created_at: "2025-03-15T12:00:00Z",
      });
      mockGetTeamById.mockResolvedValue(team);

      const response = await GET(
        createRequest("44444444-4444-4444-4444-444444444444"),
        {
          params: { id: "44444444-4444-4444-4444-444444444444" },
        },
      );

      const json = await parseResponse(response);
      expect(json.id).toBe("44444444-4444-4444-4444-444444444444");
      expect(json.name).toBe("Purdue");
      expect(json.year_id).toBe("55555555-5555-5555-5555-555555555555");
      expect(json.conference_id).toBe("66666666-6666-6666-6666-666666666666");
      expect(json.team_logo).toBe("/team-logos/bigTen/purdue.png");
      expect(json.created_at).toBe("2025-03-15T12:00:00Z");
    });
  });

  describe("error handling", () => {
    it("should return 500 when the use case throws a generic error", async () => {
      mockGetTeamById.mockRejectedValue(
        new Error("Failed to fetch team: connection refused"),
      );

      const response = await GET(createRequest("team-uuid"), {
        params: { id: "team-uuid" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("Failed to fetch team: connection refused");
    });

    it("should return error response with correct structure and path", async () => {
      mockGetTeamById.mockRejectedValue(new Error("Something broke"));

      const response = await GET(createRequest("test-team-id"), {
        params: { id: "test-team-id" },
      });

      const json = await parseResponse(response);
      expect(json).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.any(String),
            statusCode: expect.any(Number),
            timestamp: expect.any(String),
            path: "/api/team/test-team-id",
          }),
        }),
      );
    });

    it("should return 500 when no team is found", async () => {
      mockGetTeamById.mockRejectedValue(
        new Error("No team found for id: nonexistent-id"),
      );

      const response = await GET(createRequest("nonexistent-id"), {
        params: { id: "nonexistent-id" },
      });

      expect(response.status).toBe(500);
      const json = await parseResponse(response);
      expect(json.error.message).toContain("No team found");
    });
  });

  describe("response format", () => {
    it("should return JSON content type", async () => {
      mockGetTeamById.mockResolvedValue(buildTeam());

      const response = await GET(createRequest("team-uuid"), {
        params: { id: "team-uuid" },
      });

      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });
});
