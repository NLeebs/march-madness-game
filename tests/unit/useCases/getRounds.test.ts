import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRounds } from "@/application/useCases/GetRounds";
import { buildRound } from "@/tests/factories";

const mockGetRounds = vi.fn();

vi.mock("@/infrastructure/db/TournamentRepository", () => ({
  TournamentRepository: vi.fn().mockImplementation(() => ({
    getRounds: mockGetRounds,
  })),
}));

describe("getRounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return rounds from the repository", async () => {
    const expectedRounds = [
      buildRound({ round_name: "First Round" }),
      buildRound({
        id: "22222222-2222-2222-2222-222222222222",
        round_name: "Second Round",
      }),
    ];
    mockGetRounds.mockResolvedValue(expectedRounds);

    const result = await getRounds();

    expect(result).toEqual(expectedRounds);
  });

  it("should call getRounds on the repository once", async () => {
    mockGetRounds.mockResolvedValue([]);

    await getRounds();

    expect(mockGetRounds).toHaveBeenCalledTimes(1);
  });

  it("should return an empty array when no rounds exist", async () => {
    mockGetRounds.mockResolvedValue([]);

    const result = await getRounds();

    expect(result).toEqual([]);
  });

  it("should return rounds with expected fields", async () => {
    const rounds = [
      buildRound({
        id: "33333333-3333-3333-3333-333333333333",
        round_name: "Elite Eight",
        created_at: "2025-02-01T00:00:00Z",
      }),
    ];
    mockGetRounds.mockResolvedValue(rounds);

    const result = await getRounds();

    expect(result[0].id).toBe("33333333-3333-3333-3333-333333333333");
    expect(result[0].round_name).toBe("Elite Eight");
    expect(result[0].created_at).toBe("2025-02-01T00:00:00Z");
  });

  it("should propagate errors when the repository throws", async () => {
    mockGetRounds.mockRejectedValue(
      new Error("Failed to fetch rounds: connection refused"),
    );

    await expect(getRounds()).rejects.toThrow(
      "Failed to fetch rounds: connection refused",
    );
  });
});
