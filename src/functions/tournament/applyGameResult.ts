import {
  PLAYIN_ROUND_ONE_SLOTS,
  ROUND_CONFIG,
  nextRegionOf,
} from "@/src/functions/tournament/roundConfig";
import type {
  BracketMatchups,
  PlayinSeedType,
  ScoredRound,
  TournamentGameResult,
  TournamentRegion,
  TournamentRoundMatchups,
} from "@/types";

export interface PlayinGameResult {
  seedType: PlayinSeedType;
  gameIndex: number;
  winningTeam: string;
  /** Optional because the play-in driver dispatches no scores today (the scores stay undefined). */
  winningScore?: number;
  losingScore?: number;
}

type Game = { team: string; score?: unknown; win?: boolean }[];

/** Copies a game, setting score/win on both teams from the winner. */
function scoreGame(
  game: Game,
  winningTeam: string,
  winningScore: number | undefined,
  losingScore: number | undefined
): Game {
  return game.map((team) =>
    team.team === winningTeam
      ? { ...team, score: winningScore, win: true }
      : { ...team, score: losingScore, win: false }
  );
}

/**
 * Applies a play-in result: puts the winner into its round-one slot and
 * records score/win on the play-in game. Any seedType other than
 * "elevenSeeds" uses the sixteen-seed slots; any gameIndex other than 0 the
 * second slot.
 */
export function applyPlayinResult(
  roundOne: TournamentRoundMatchups,
  result: PlayinGameResult
): TournamentRoundMatchups {
  const { seedType, gameIndex, winningTeam, winningScore, losingScore } =
    result;
  const slots =
    PLAYIN_ROUND_ONE_SLOTS[
      seedType === "elevenSeeds" ? "elevenSeeds" : "sixteenSeeds"
    ];
  const slot = gameIndex === 0 ? slots[0] : slots[1];

  const regionGames = roundOne[slot.region].map((g) => g);
  const slotGame = regionGames[slot.game].map((t) => t);
  slotGame[1] = { ...slotGame[1], team: winningTeam };
  regionGames[slot.game] = slotGame;

  const playinGames = roundOne.playin[seedType].map((g) => g);
  playinGames[gameIndex] = scoreGame(
    playinGames[gameIndex] as unknown as Game,
    winningTeam,
    winningScore,
    losingScore
  ) as unknown as (typeof playinGames)[number];

  return {
    ...roundOne,
    [slot.region]: regionGames,
    playin: { ...roundOne.playin, [seedType]: playinGames },
  };
}

type RoundGames = Record<string, Game[]>;

/**
 * Applies a tournament game result: pushes the winner onto the next round
 * (push semantics, so call order decides the slot) and records score/win on
 * the played game. Replaces only the round's own and next round's keys.
 */
export function applyGameResult(
  bracket: BracketMatchups,
  round: ScoredRound,
  result: TournamentGameResult
): BracketMatchups {
  if (result.region === null) {
    throw new Error("applyGameResult: result has no region");
  }
  const region: TournamentRegion = result.region;
  const { matchupsKey, nextMatchupsKey } = ROUND_CONFIG[round];
  const nextRegion = nextRegionOf(round, region);
  const slotIndex = Math.floor(result.gameIndex / 2);

  const nextRound = bracket[nextMatchupsKey] as unknown as RoundGames;
  const nextRegionGames = nextRound[nextRegion].map((g) => g);
  nextRegionGames[slotIndex] = [
    ...nextRegionGames[slotIndex],
    { team: result.winningTeam, seed: result.seed } as unknown as Game[number],
  ];

  const currentRound = bracket[matchupsKey] as unknown as RoundGames;
  const currentRegionGames = currentRound[region].map((g) => g);
  currentRegionGames[result.gameIndex] = scoreGame(
    currentRegionGames[result.gameIndex],
    result.winningTeam,
    result.winningScore,
    result.losingScore
  );

  return {
    ...bracket,
    [matchupsKey]: { ...currentRound, [region]: currentRegionGames },
    [nextMatchupsKey]: { ...nextRound, [nextRegion]: nextRegionGames },
  } as BracketMatchups;
}
