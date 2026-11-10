import { describe, it, expect, afterEach } from "vitest";
import { playGame } from "@/src/functions";
import { TeamStats } from "@/models";
import { buildLeague } from "@/tests/factories";
import { mulberry32, seedMathRandom } from "./helpers/rng";

const allTeams = (): TeamStats[] =>
  Object.values(buildLeague().teamStats).flatMap((conf) => Object.values(conf));

describe("playGame invariants", () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it("holds result invariants across 20 seeds x 50 games", () => {
    const teamArray = allTeams();

    for (let seed = 1; seed <= 20; seed++) {
      const pick = mulberry32(seed + 1000);
      const seeded = seedMathRandom(seed);
      restore = seeded.restore;

      // Pair selection uses its own generator (not Math.random)
      const pairs = Array.from({ length: 50 }, () => {
        const i = Math.floor(pick() * teamArray.length);
        let j = Math.floor(pick() * teamArray.length);
        if (j === i) j = (j + 1) % teamArray.length;
        return [teamArray[i], teamArray[j]] as const;
      });

      for (const [team1, team2] of pairs) {
        const result = playGame(team1, team2);
        const lowerRpi = +team1.rpi <= +team2.rpi ? team1 : team2;
        const higherRpi = lowerRpi === team1 ? team2 : team1;

        expect(result.favoredScore).toBeGreaterThan(-1);
        expect(result.underdogScore).toBeGreaterThan(-1);
        expect(Number.isInteger(result.favoredScore)).toBe(true);
        expect(Number.isInteger(result.underdogScore)).toBe(true);
        expect(result.favoredScore).not.toBe(result.underdogScore);

        expect(result.favoredTeam).toBe(lowerRpi.name);
        expect(result.underdogTeam).toBe(higherRpi.name);
        expect(result.favoredRPI).toBe(+lowerRpi.rpi);
        expect(result.underdogRPI).toBe(+higherRpi.rpi);
        expect([result.favoredTeam, result.underdogTeam].sort()).toEqual(
          [team1.name, team2.name].sort()
        );
      }

      seeded.restore();
      restore = undefined;
    }
  });

  it("equal RPI: team1 is favored", () => {
    const teamArray = allTeams();
    const team1 = { ...teamArray[10], name: "Team One" };
    const team2 = { ...teamArray[10], name: "Team Two" };
    const seeded = seedMathRandom(7);
    restore = seeded.restore;

    // current behaviour: the swap uses a strict ">", so ties keep team1 as favored
    const result = playGame(team1, team2);
    expect(result.favoredTeam).toBe("Team One");
    expect(result.underdogTeam).toBe("Team Two");
  });
});
