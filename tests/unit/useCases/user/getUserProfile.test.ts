import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserProfile } from "@/application/useCases";
import { buildProfile } from "@/tests/factories";

const mockGetProfileByUserId = vi.fn();

vi.mock("@/infrastructure/db/UserRepository", () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    getProfileByUserId: mockGetProfileByUserId,
  })),
}));

describe("getUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a user profile for a valid userId", async () => {
    const expectedProfile = buildProfile();
    mockGetProfileByUserId.mockResolvedValue(expectedProfile);

    const result = await getUserProfile("user-uuid-123");

    expect(result).toEqual(expectedProfile);
  });

  it("should forward the userId to the repository", async () => {
    mockGetProfileByUserId.mockResolvedValue(buildProfile());

    await getUserProfile("specific-user-id");

    expect(mockGetProfileByUserId).toHaveBeenCalledWith("specific-user-id");
    expect(mockGetProfileByUserId).toHaveBeenCalledTimes(1);
  });

  it("should return the profile with all expected fields", async () => {
    const profile = buildProfile({
      id: "abc-123",
      username: "testUser",
      favorite_team_id: "team-xyz",
    });
    mockGetProfileByUserId.mockResolvedValue(profile);

    const result = await getUserProfile("abc-123");

    expect(result.id).toBe("abc-123");
    expect(result.username).toBe("testUser");
    expect(result.favorite_team_id).toBe("team-xyz");
  });

  it("should return a profile with nullable favorite_team_id", async () => {
    const profile = buildProfile({ favorite_team_id: null });
    mockGetProfileByUserId.mockResolvedValue(profile);

    const result = await getUserProfile("user-uuid-123");

    expect(result.favorite_team_id).toBeNull();
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetProfileByUserId.mockRejectedValue(
      new Error("Failed to fetch user profile: connection refused"),
    );

    await expect(getUserProfile("user-uuid-123")).rejects.toThrow(
      "Failed to fetch user profile: connection refused",
    );
  });

  it("should propagate errors when no profile is found", async () => {
    mockGetProfileByUserId.mockRejectedValue(
      new Error("No user profile found for id: nonexistent-id"),
    );

    await expect(getUserProfile("nonexistent-id")).rejects.toThrow(
      "No user profile found for id: nonexistent-id",
    );
  });
});
