import { beforeEach, describe, expect, it, vi } from "vitest";
import { TournamentRepository } from "@/infrastructure/db/TournamentRepository";
import { createSupabaseServiceRoleClient } from "@/infrastructure/db/supabaseServiceRole";

vi.mock("@/infrastructure/db/supabaseServiceRole", () => ({
  createSupabaseServiceRoleClient: vi.fn(),
}));

type YearRow = { id: string; year: number };
type QueryResult = { data: YearRow[] | null; error: { message: string } | null };

const from = vi.fn();
const select = vi.fn();
const order = vi.fn();

/** Wires the from().select().order() chain getYears uses to resolve to `result`. */
function mockQuery(result: QueryResult) {
  order.mockResolvedValue(result);
  select.mockReturnValue({ order });
  from.mockReturnValue({ select });
  // cast: only the from().select().order() chain is faked
  vi.mocked(createSupabaseServiceRoleClient).mockReturnValue(
    { from } as unknown as ReturnType<typeof createSupabaseServiceRoleClient>
  );
}

describe("TournamentRepository.getYears", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("orders years oldest first, so callers can take the last as the newest", async () => {
    const data = [
      { id: "a", year: 2024 },
      { id: "b", year: 2025 },
    ];
    mockQuery({ data, error: null });

    const years = await new TournamentRepository().getYears();

    expect(from).toHaveBeenCalledWith("years");
    expect(select).toHaveBeenCalledWith("id, year");
    expect(order).toHaveBeenCalledWith("year", { ascending: true });
    expect(years).toEqual(data);
  });

  it("throws on a Supabase error", async () => {
    mockQuery({ data: null, error: { message: "connection refused" } });

    await expect(new TournamentRepository().getYears()).rejects.toThrow(
      "Failed to fetch years: connection refused"
    );
  });
});
