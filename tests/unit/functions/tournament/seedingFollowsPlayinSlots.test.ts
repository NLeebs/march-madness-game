import { describe, it, expect, vi } from "vitest";
import { seedTournament } from "@/src/functions/tournament/seedTournament";

// Swap which regions host the play-in games: seeding must follow
// PLAYIN_ROUND_ONE_SLOTS instead of hard-coding west/east and south/midwest.
vi.mock("@/src/functions/tournament/roundConfig", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/src/functions/tournament/roundConfig")>();
  return {
    ...actual,
    PLAYIN_ROUND_ONE_SLOTS: {
      elevenSeeds: [
        { region: "west", game: 4 },
        { region: "east", game: 4 },
      ],
      sixteenSeeds: [
        { region: "south", game: 0 },
        { region: "midwest", game: 0 },
      ],
    },
  };
});

const pad = (n: number) => String(n).padStart(2, "0");
const SIXTY = Array.from({ length: 60 }, (_, i) => `s${pad(i + 1)}`);

describe("seedTournament with swapped play-in slots", () => {
  const seeds = seedTournament(SIXTY);

  it("puts the 11-seed placeholders in the regions PLAYIN_ROUND_ONE_SLOTS names", () => {
    expect(seeds.west[10]).toBe("playinGameSeed11Game1");
    expect(seeds.east[10]).toBe("playinGameSeed11Game2");
    expect(seeds.south[10]).not.toMatch(/^playin/);
    expect(seeds.midwest[10]).not.toMatch(/^playin/);
  });

  it("puts the 16-seed placeholders in the regions PLAYIN_ROUND_ONE_SLOTS names", () => {
    expect(seeds.south[15]).toBe("playinGameSeed16Game1");
    expect(seeds.midwest[15]).toBe("playinGameSeed16Game2");
    expect(seeds.west[15]).not.toMatch(/^playin/);
    expect(seeds.east[15]).not.toMatch(/^playin/);
  });

  it("still seeds all 60 teams exactly once", () => {
    const real = Object.values(seeds)
      .flat()
      .filter((t) => !t.startsWith("playin"));
    expect([...real].sort()).toEqual(SIXTY);
  });
});
