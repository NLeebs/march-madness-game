import { describe, it, expect, vi, afterEach } from "vitest";
import { playGame } from "@/src/functions";
import { buildLeague } from "@/tests/factories";
import { mulberry32, seedMathRandom } from "./helpers/rng";
import { GAME_TEST_TIMEOUT } from "./helpers/timeout";

const PAIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 360],
  [1, 2],
  [50, 60],
  [180, 181],
  [300, 10],
];

describe("playGame rng parameter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("an injected mulberry32 matches a seeded Math.random and never touches Math.random", () => {
    const teamArray = Object.values(buildLeague().teamStats).flatMap((conf) =>
      Object.values(conf)
    );
    const byRank = (rank: number) => {
      const team = teamArray.find((t) => t.rpi === String(rank));
      if (!team) throw new Error(`no team with rpi ${rank}`);
      return team;
    };

    for (const seed of [1, 2, 3]) {
      for (const [a, b] of PAIRS) {
        const seeded = seedMathRandom(seed);
        const viaMath = playGame(byRank(a), byRank(b));
        const mathDraws = seeded.calls();
        seeded.restore();

        const spy = vi.spyOn(Math, "random");
        const inner = mulberry32(seed);
        let injectedDraws = 0;
        const viaRng = playGame(byRank(a), byRank(b), () => {
          injectedDraws++;
          return inner();
        });
        const spyCalls = spy.mock.calls.length;
        spy.mockRestore();

        expect(viaRng, `${a} v ${b} seed ${seed}`).toEqual(viaMath);
        expect(injectedDraws, `${a} v ${b} seed ${seed}`).toBe(mathDraws);
        expect(spyCalls, `${a} v ${b} seed ${seed}`).toBe(0);
      }
    }
  }, GAME_TEST_TIMEOUT);
});
