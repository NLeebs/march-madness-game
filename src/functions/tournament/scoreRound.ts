import type { ScoredRound } from "@/types";

export type RoundPoints = Readonly<Record<ScoredRound, number>>;

/** Points awarded per correct pick, by the round whose results are scored. */
export const ROUND_POINTS: RoundPoints = {
  1: 10,
  2: 20,
  "sweet sixteen": 40,
  "elite eight": 80,
  "final four": 160,
  finals: 320,
};

type Slots = Readonly<
  Record<string, ReadonlyArray<ReadonlyArray<{ team: string }>>>
>;

export interface RoundScore {
  correct: Record<string, boolean[][]>;
  points: number;
}

/**
 * Scores the player's picks for the round after `round`. Only the slots in
 * `advanced` are scored; a slot is correct when the picked team appears
 * anywhere in `winningTeams`.
 *
 * `advanced` only supplies which slots exist; its team values are never read.
 * A server caller can pass any structure with the next round's slot shape
 * (e.g. the next round's picks, or a shape rebuilt from stored games) once the
 * round is complete.
 */
export function scoreRound(input: {
  round: ScoredRound;
  advanced: Slots;
  picks: Slots;
  winningTeams: readonly string[];
  points: RoundPoints;
}): RoundScore {
  const { round, advanced, picks, winningTeams, points } = input;
  const correct: Record<string, boolean[][]> = {};
  let total = 0;
  Object.keys(advanced).forEach((region) => {
    correct[region] = advanced[region].map((matchup, i) =>
      matchup.map((_, j) => {
        const isCorrect = winningTeams.includes(picks[region][i][j].team);
        if (isCorrect) total += points[round];
        return isCorrect;
      })
    );
  });
  return { correct, points: total };
}
