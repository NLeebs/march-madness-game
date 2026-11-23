import { describe, expect, it } from "vitest";
import { ROUND_BY_NAME, scoredRoundByName } from "@/infrastructure/db/roundNames";

describe("ROUND_BY_NAME", () => {
  it("maps every rounds.round_name to its round", () => {
    expect(ROUND_BY_NAME["1"]).toBe(1);
    expect(ROUND_BY_NAME["sweet sixteen"]).toBe("sweet sixteen");
    expect(ROUND_BY_NAME.champion).toBe("champion");
    expect(Object.keys(ROUND_BY_NAME)).toHaveLength(7);
  });
});

describe("scoredRoundByName", () => {
  it("returns scored rounds", () => {
    expect(scoredRoundByName("finals")).toBe("finals");
    expect(scoredRoundByName("2")).toBe(2);
  });

  it("returns undefined for champion and unknown names", () => {
    expect(scoredRoundByName("champion")).toBeUndefined();
    expect(scoredRoundByName("bogus")).toBeUndefined();
  });
});
