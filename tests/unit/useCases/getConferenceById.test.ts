import { describe, it, expect, vi, beforeEach } from "vitest";
import { getConferenceById } from "@/application/useCases/GetConferenceById";
import { ConferenceSupabase } from "@/models/appStatsData";

const mockGetConferenceById = vi.fn();

vi.mock("@/infrastructure/db/ConferenceRepository", () => ({
  ConferenceRepository: vi.fn().mockImplementation(() => ({
    getConferenceById: mockGetConferenceById,
  })),
}));

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

describe("getConferenceById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a conference for a valid id", async () => {
    const expectedConference = buildConference();
    mockGetConferenceById.mockResolvedValue(expectedConference);

    const result = await getConferenceById(
      "11111111-1111-1111-1111-111111111111",
    );

    expect(result).toEqual(expectedConference);
  });

  it("should forward the id to the repository", async () => {
    mockGetConferenceById.mockResolvedValue(buildConference());

    await getConferenceById("specific-conference-id");

    expect(mockGetConferenceById).toHaveBeenCalledWith("specific-conference-id");
    expect(mockGetConferenceById).toHaveBeenCalledTimes(1);
  });

  it("should return the conference with all expected fields", async () => {
    const conference = buildConference({
      id: "44444444-4444-4444-4444-444444444444",
      conference: "SEC",
      conference_logo: "/conference-logos/sec.png",
      created_at: "2025-02-01T00:00:00Z",
    });
    mockGetConferenceById.mockResolvedValue(conference);

    const result = await getConferenceById(
      "44444444-4444-4444-4444-444444444444",
    );

    expect(result.id).toBe("44444444-4444-4444-4444-444444444444");
    expect(result.conference).toBe("SEC");
    expect(result.conference_logo).toBe("/conference-logos/sec.png");
    expect(result.created_at).toBe("2025-02-01T00:00:00Z");
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetConferenceById.mockRejectedValue(
      new Error("Failed to fetch conference: connection refused"),
    );

    await expect(getConferenceById("conference-uuid-123")).rejects.toThrow(
      "Failed to fetch conference: connection refused",
    );
  });

  it("should propagate errors when no conference is found", async () => {
    mockGetConferenceById.mockRejectedValue(
      new Error("No conference found for id: nonexistent-id"),
    );

    await expect(getConferenceById("nonexistent-id")).rejects.toThrow(
      "No conference found for id: nonexistent-id",
    );
  });
});
