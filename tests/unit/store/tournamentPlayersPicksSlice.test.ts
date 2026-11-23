import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyPicks } from "@/src/functions/tournament/emptyState";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("tournamentPlayersPicksSlice initial state", () => {
  // The server refuses picks that do not follow from the field (validateBracketPicks), so a
  // hard-coded pre-fill would crash Play Tournament.
  it("starts with empty picks", async () => {
    vi.resetModules();
    const { default: slice } = await import("@/store/tournamentPlayersPicksSlice");

    expect(slice.getInitialState()).toEqual({ picks: emptyPicks() });
  });
});
