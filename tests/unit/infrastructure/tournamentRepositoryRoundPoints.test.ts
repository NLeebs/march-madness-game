import { beforeEach, describe, expect, it, vi } from "vitest";
import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { createSupabaseServiceRoleClient } from "@/infrastructure/db/supabaseServiceRole";

vi.mock("@/infrastructure/db/supabaseServiceRole", () => ({
  createSupabaseServiceRoleClient: vi.fn(),
}));

type RoundPointsRow = {
  score: number | null;
  created_at: string;
  rounds: { round_name: string } | null;
};
type QueryResult = { data: RoundPointsRow[] | null; error: { message: string } | null };

const from = vi.fn();
const select = vi.fn();
const order = vi.fn();

/** Wires the from().select().order() chain getRoundPoints uses to resolve to `result`. */
function mockQuery(result: QueryResult) {
  order.mockResolvedValue(result);
  select.mockReturnValue({ order });
  from.mockReturnValue({ select });
  // cast: only the from().select().order() chain is faked
  vi.mocked(createSupabaseServiceRoleClient).mockReturnValue(
    { from } as unknown as ReturnType<typeof createSupabaseServiceRoleClient>
  );
}

const SCORED_ROUND_NAMES = ["1", "2", "sweet sixteen", "elite eight", "final four", "finals"];

/** One row per scored round, newest first (as the query orders them). */
function rows(score: (roundName: string) => number, createdAt: string): RoundPointsRow[] {
  return SCORED_ROUND_NAMES.map((round_name) => ({
    score: score(round_name),
    created_at: createdAt,
    rounds: { round_name },
  }));
}

describe("TournamentRepository.getRoundPoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries tournament_round_scoring newest first", async () => {
    mockQuery({ data: rows(() => 1, "2026-01-01"), error: null });

    await new TournamentRepository().getRoundPoints();

    expect(from).toHaveBeenCalledWith("tournament_round_scoring");
    expect(select).toHaveBeenCalledWith("score, created_at, rounds(round_name)");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("keeps the latest (first) row per round", async () => {
    const latest = rows((name) => SCORED_ROUND_NAMES.indexOf(name) + 10, "2026-02-01");
    const older = rows(() => 99, "2026-01-01");
    mockQuery({
      data: [
        ...latest,
        ...older,
        // champion is not a scored round; rows without a round are skipped
        { score: 500, created_at: "2026-02-01", rounds: { round_name: "champion" } },
        { score: 7, created_at: "2026-02-01", rounds: null },
      ],
      error: null,
    });

    const points = await new TournamentRepository().getRoundPoints();

    expect(points).toEqual({
      1: 10,
      2: 11,
      "sweet sixteen": 12,
      "elite eight": 13,
      "final four": 14,
      finals: 15,
    });
  });

  it("skips a null score and uses the next row for that round", async () => {
    const data = rows(() => 5, "2026-01-01");
    mockQuery({
      data: [{ score: null, created_at: "2026-02-01", rounds: { round_name: "finals" } }, ...data],
      error: null,
    });

    const points = await new TournamentRepository().getRoundPoints();

    expect(points.finals).toBe(5);
  });

  it("throws when a scored round has no points", async () => {
    mockQuery({
      data: rows(() => 1, "2026-01-01").filter((row) => row.rounds?.round_name !== "elite eight"),
      error: null,
    });

    await expect(new TournamentRepository().getRoundPoints()).rejects.toThrow(
      "No round points for rounds: elite eight"
    );
  });

  it("throws on a Supabase error", async () => {
    mockQuery({ data: null, error: { message: "connection refused" } });

    await expect(new TournamentRepository().getRoundPoints()).rejects.toThrow(
      "Failed to fetch round points: connection refused"
    );
  });
});
