import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyPicks } from "@/src/functions/tournament/emptyState";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("tournamentPlayersPicksSlice initial state", () => {
  // The server refuses picks that do not follow from the field (validateBracketPicks), so a
  // hard-coded pre-fill would crash Play Tournament: dev mode starts with empty picks too.
  it("starts with empty picks in dev mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_MODE", "dev");
    vi.resetModules();
    const { default: slice } = await import("@/store/tournamentPlayersPicksSlice");

    expect(slice.getInitialState()).toEqual({ picks: emptyPicks() });
  });
});
