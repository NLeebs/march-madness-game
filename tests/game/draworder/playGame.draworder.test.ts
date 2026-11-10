import { describe, it, expect, afterEach } from "vitest";
import { playGame } from "@/src/functions";
import { buildLeague } from "@/tests/factories";
import { seedMathRandom } from "../helpers/rng";

const PAIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 360],
  [1, 2],
  [50, 60],
  [180, 181],
  [300, 10],
];

describe("playGame draw order", () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it("pins results and Math.random draw counts for fixed pairs and seeds", () => {
    const teamArray = Object.values(buildLeague().teamStats).flatMap((conf) =>
      Object.values(conf)
    );
    const byRank = (rank: number) => {
      const team = teamArray.find((t) => t.rpi === String(rank));
      if (!team) throw new Error(`no team with rpi ${rank}`);
      return team;
    };

    const pins = [1, 2, 3].flatMap((seed) =>
      PAIRS.map(([a, b]) => {
        const seeded = seedMathRandom(seed);
        restore = seeded.restore;
        const result = playGame(byRank(a), byRank(b));
        const draws = seeded.calls();
        seeded.restore();
        restore = undefined;
        return { pair: `${a} v ${b}`, seed, result, draws };
      })
    );

    expect(pins).toMatchSnapshot();
  });
});
