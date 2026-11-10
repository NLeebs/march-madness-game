import { describe, it, expect, afterEach } from "vitest";
import { numberOfConferences } from "@/src/components/Add-To-Firebase/teamStatURLUtils";
import { NUMBER_OF_AT_LARGE_TEAMS } from "@/src/constants";
import { teamScheduleActions } from "@/store";
import { mulberry32, seedMathRandom } from "./helpers/rng";
import { recordActions } from "./helpers/renderWithStore";
import { buildLeague, configureStoreForLeague } from "@/tests/factories/league.factory";
import { createAppStore } from "@/store";

describe("rng helpers", () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it("mulberry32 is deterministic", () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    for (let i = 0; i < 10; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("seedMathRandom stubs and restores", () => {
    const original = Math.random;
    const seeded = seedMathRandom(1);
    restore = seeded.restore;
    expect(Math.random()).toBe(mulberry32(1)());
    expect(seeded.calls()).toBe(1);
    seeded.restore();
    restore = undefined;
    expect(Math.random).toBe(original);
  });
});

describe("buildLeague", () => {
  it("has the expected shape", () => {
    const league = buildLeague();
    expect(league.teamArray).toHaveLength(360);
    expect(Object.keys(league.teamStats).length).toBe(numberOfConferences);
    expect(NUMBER_OF_AT_LARGE_TEAMS).toBe(68 - numberOfConferences);

    const sizes = Object.values(league.teamStats).map(
      (c) => Object.keys(c).length
    );
    expect(sizes.filter((s) => s % 2 === 1).length).toBeGreaterThanOrEqual(2);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(2);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(360);

    const rpis = Object.values(league.teamStats)
      .flatMap((c) => Object.values(c))
      .map((t) => t.rpi)
      .sort((a, b) => Number(a) - Number(b));
    expect(rpis).toEqual(Array.from({ length: 360 }, (_, i) => String(i + 1)));
  });

  it("teamArray order equals teamScheduleConfig order", () => {
    const league = buildLeague();
    const store = createAppStore();
    store.dispatch(teamScheduleActions.teamScheduleConfig(league.teamStats));
    expect(league.teamArray).toEqual(store.getState().teamSchedule.teamArray);
  });

  it("is deterministic", () => {
    expect(buildLeague()).toEqual(buildLeague());
  });
});

describe("recordActions", () => {
  it("captures dispatched actions in order", () => {
    const { middleware, actions } = recordActions();
    const store = createAppStore({ extraMiddleware: [middleware] });
    store.dispatch({ type: "a" });
    store.dispatch({ type: "b" });
    expect(actions.map((a) => a.type)).toEqual(["a", "b"]);
  });
});

describe("configureStoreForLeague", () => {
  it("configures schedules and records", () => {
    const store = createAppStore();
    configureStoreForLeague(store, buildLeague());
    const state = store.getState();
    expect(Object.keys(state.teamSchedule.teamSchedules)).toEqual(
      Array.from({ length: 30 }, (_, i) => `week${i + 1}`)
    );
    const records = Object.values(state.regularSeasonRecords.records);
    expect(records).toHaveLength(360);
    for (const r of records) {
      expect(r).toEqual({ wins: 0, losses: 0, tournamentSelectionScore: 0 });
    }
  });
});

describe("createAppStore devChecks", () => {
  it("devChecks: false builds the same state shape", () => {
    expect(Object.keys(createAppStore({ devChecks: false }).getState())).toEqual(
      Object.keys(createAppStore().getState())
    );
  });
});
