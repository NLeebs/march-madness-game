import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const scope = vi.hoisted(() => ({
  setTag: vi.fn(),
  setContext: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  withScope: vi.fn((cb: (s: typeof scope) => void) => cb(scope)),
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { createAppStore } from "@/store/store";
import { buildLeague } from "@/tests/factories";
import { GameDataError } from "@/src/functions";
import {
  summarizeGameState,
  reportCrash,
  readAnonUserId,
  type GameCrashContext,
} from "@/src/utils/crashReporting";

const game: GameCrashContext = {
  activeFlags: ["regularSeason"],
  tournamentRound: null,
  yearId: "y1",
  teamCount: 10,
  weeksPlayed: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("summarizeGameState", () => {
  it("summarizes a fresh store", () => {
    expect(summarizeGameState(createAppStore().getState())).toEqual({
      activeFlags: ["startScreen", "loading"],
      tournamentRound: null,
      yearId: "",
      teamCount: 0,
      weeksPlayed: 0,
    });
  });

  it("reports the selected round, year and team count during the tournament", () => {
    const league = buildLeague();
    const base = createAppStore().getState();
    const state = {
      ...base,
      appState: { ...base.appState, startScreen: false, loading: false, tournament: true },
      uiState: { ...base.uiState, selectedRound: "sweet sixteen" as const },
      tournament: { ...base.tournament, yearId: "y1" },
      teamStats: { ...base.teamStats, conferenceArrays: league.conferenceArrays },
      regularSeasonRecords: { ...base.regularSeasonRecords, weeksPlayed: 30 },
    };
    const teamCount = Object.values(league.conferenceArrays).flat().length;
    expect(summarizeGameState(state)).toEqual({
      activeFlags: ["tournament"],
      tournamentRound: "sweet sixteen",
      yearId: "y1",
      teamCount,
      weeksPlayed: 30,
    });
  });
});

describe("reportCrash", () => {
  it("attaches game context, bad-data details and the user id", () => {
    const err = new GameDataError("m", { team: "A" });
    reportCrash(err, { boundary: "game", game, userId: "u1" });
    expect(scope.setTag).toHaveBeenCalledWith("boundary", "game");
    expect(scope.setContext).toHaveBeenCalledWith("game", game);
    expect(scope.setContext).toHaveBeenCalledWith("gameData", { team: "A" });
    expect(scope.setUser).toHaveBeenCalledWith({ id: "u1" });
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });

  it("tags the anonymous id when there is no user id", () => {
    reportCrash(new Error("x"), { boundary: "game", anonUserId: "anon-1" });
    expect(scope.setTag).toHaveBeenCalledWith("anon_user_id", "anon-1");
    expect(scope.setUser).not.toHaveBeenCalled();
  });

  it("tags the Next.js error digest when there is one", () => {
    reportCrash(new Error("x"), { boundary: "route", digest: "d-123" });
    expect(scope.setTag).toHaveBeenCalledWith("digest", "d-123");
  });

  it("adds no gameData context for a plain Error", () => {
    reportCrash(new Error("x"), { boundary: "route" });
    expect(scope.setContext).not.toHaveBeenCalledWith("gameData", expect.anything());
  });

  it("reports a thrown non-Error value without throwing", () => {
    expect(() => reportCrash("boom", { boundary: "route" })).not.toThrow();
    expect(Sentry.captureException).toHaveBeenCalledWith("boom");
  });

  it("never throws when Sentry throws", () => {
    vi.mocked(Sentry.captureException).mockImplementationOnce(() => {
      throw new Error("sentry down");
    });
    expect(() => reportCrash(new Error("x"), { boundary: "game" })).not.toThrow();
  });
});

describe("readAnonUserId", () => {
  const KEY = "test-anon-key-name";

  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_BROWSER_ANON_KEY", KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns the stored anonymous id", () => {
    localStorage.setItem(KEY, "anon-1");
    expect(readAnonUserId()).toBe("anon-1");
  });

  it("returns undefined and creates nothing when no id is stored", () => {
    expect(readAnonUserId()).toBeUndefined();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("returns undefined when the env var is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_ANON_KEY", "");
    localStorage.setItem(KEY, "anon-1");
    expect(readAnonUserId()).toBeUndefined();
  });

  it("returns undefined when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readAnonUserId()).toBeUndefined();
  });
});
