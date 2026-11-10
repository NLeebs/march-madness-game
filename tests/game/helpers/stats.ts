import { GameResult } from "@/types";

export type GameSample = { result: GameResult; rpiGap: number };

export type GameMetrics = {
  favoredWinRate: number;
  favoredWinRateByGap: { small: number; medium: number; large: number };
  meanWinningScore: number;
  sdWinningScore: number;
  meanLosingScore: number;
  sdLosingScore: number;
  meanMargin: number;
  sdMargin: number;
  oneScoreMarginRate: number;
};

const mean = (xs: number[]): number =>
  xs.reduce((sum, x) => sum + x, 0) / xs.length;

const sd = (xs: number[]): number => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

const favoredWinRateOf = (samples: GameSample[]): number =>
  mean(samples.map(({ result }) => (result.favoredScore > result.underdogScore ? 1 : 0)));

/** Gap bands in ranks: small < 30, medium 30-119, large >= 120. */
export function measureGames(results: GameSample[]): GameMetrics {
  const winning = results.map(({ result }) => Math.max(result.favoredScore, result.underdogScore));
  const losing = results.map(({ result }) => Math.min(result.favoredScore, result.underdogScore));
  const margins = winning.map((w, i) => w - losing[i]);

  return {
    favoredWinRate: favoredWinRateOf(results),
    favoredWinRateByGap: {
      small: favoredWinRateOf(results.filter((r) => r.rpiGap < 30)),
      medium: favoredWinRateOf(results.filter((r) => r.rpiGap >= 30 && r.rpiGap < 120)),
      large: favoredWinRateOf(results.filter((r) => r.rpiGap >= 120)),
    },
    meanWinningScore: mean(winning),
    sdWinningScore: sd(winning),
    meanLosingScore: mean(losing),
    sdLosingScore: sd(losing),
    meanMargin: mean(margins),
    sdMargin: sd(margins),
    oneScoreMarginRate: mean(margins.map((m) => (m === 1 ? 1 : 0))),
  };
}

export type SeasonMetrics = {
  meanWins: number;
  sdWins: number;
  /** Pearson correlation of RPI rank (1 = best) with wins; strongly negative. */
  rankWinsCorrelation: number;
};

/** teams: one entry per team with its RPI rank and season wins. */
export function measureSeason(teams: { rpi: number; wins: number }[]): SeasonMetrics {
  const wins = teams.map((t) => t.wins);
  const ranks = teams.map((t) => t.rpi);
  const mw = mean(wins);
  const mr = mean(ranks);
  const cov = mean(teams.map((t) => (t.rpi - mr) * (t.wins - mw)));
  return {
    meanWins: mw,
    sdWins: sd(wins),
    rankWinsCorrelation: cov / (sd(ranks) * sd(wins)),
  };
}

type MetricTree = { [key: string]: number | MetricTree };

/**
 * Compares every metric in `actual` with `expected` and returns one line per metric whose
 * deviation exceeds its tolerance (empty when all are within). `tolerance` has the same shape.
 */
export function outOfTolerance<T extends object>(actual: T, expected: T, tolerance: T): string[] {
  const walk = (a: MetricTree, e: MetricTree, t: MetricTree, path: string): string[] =>
    Object.keys(e).flatMap((key) => {
      const name = path ? `${path}.${key}` : key;
      const [av, ev, tv] = [a[key], e[key], t[key]];
      if (typeof ev !== "number") {
        return walk(av as MetricTree, ev, tv as MetricTree, name);
      }
      const deviation = Math.abs((av as number) - ev);
      return deviation <= (tv as number)
        ? []
        : [`${name}: expected ${ev} ± ${tv}, actual ${(av as number).toFixed(4)} (off by ${deviation.toFixed(4)})`];
    });
  return walk(actual as unknown as MetricTree, expected as unknown as MetricTree, tolerance as unknown as MetricTree, "");
}
