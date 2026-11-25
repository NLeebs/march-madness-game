import { GameDataError } from "@/src/functions/generic";
import {
  PLAYIN_ROUND_ONE_SLOTS,
  ROUND_CONFIG,
  nextRegionOf,
} from "@/src/functions/tournament/roundConfig";
import type {
  BracketMatchups,
  PlayInGameWinner,
  ScoredRound,
  TournamentGameResult,
  TournamentRegion,
  TournamentMatchup,
  TournamentRoundMatchups,
} from "@/types";

/** Scores are optional because the play-in driver dispatches none today (finding 54). */
export type PlayinGameResult = PlayInGameWinner & {
  winningScore?: number;
  losingScore?: number;
};

/** Copies a game, setting score/win on both teams from the winner. */
function scoreGame(
  game: TournamentMatchup,
  winningTeam: string,
  winningScore: number | undefined,
  losingScore: number | undefined
): TournamentMatchup {
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

  const roundOneGames = roundOne[slot.region];
  const { playin } = roundOne;
  const missing = !roundOneGames
    ? "round one has no games for the slot's region"
    : !roundOneGames[slot.game]
      ? "round one has no game in the play-in winner's slot"
      : !playin
        ? "round one has no play-in games"
        : !playin[seedType]?.[gameIndex]
          ? "the play-in game is missing"
          : null;
  if (missing !== null || !roundOneGames || !playin) {
    throw new GameDataError(`applyPlayinResult: ${missing}`, {
      region: slot.region,
      slotGame: slot.game,
      seedType,
      gameIndex,
    });
  }

  const regionGames = roundOneGames.map((g) => g);
  const slotGame = regionGames[slot.game].map((t) => t);
  slotGame[1] = { ...slotGame[1], team: winningTeam };
  regionGames[slot.game] = slotGame;

  const playinGames = playin[seedType].map((g) => g);
  playinGames[gameIndex] = scoreGame(
    playinGames[gameIndex],
    winningTeam,
    winningScore,
    losingScore
  );

  return {
    ...roundOne,
    [slot.region]: regionGames,
    playin: { ...playin, [seedType]: playinGames },
  };
}

type RoundGames = Partial<
  Record<Exclude<TournamentRegion, "playin">, TournamentMatchup[]>
>;

/** A region's games; the "playin" key holds play-in games, not a region's, so it has none. */
const gamesIn = (
  round: RoundGames,
  region: TournamentRegion
): TournamentMatchup[] | undefined =>
  region === "playin" ? undefined : round[region];

/**
 * Applies a tournament game result: writes the winner into its next-round
 * slot (`ROUND_CONFIG[round].advance[region].teamIndex` when the region
 * changes, else `gameIndex % 2`, the same slots picks use) and records
 * score/win on the played game. Replaces only the round's own and next
 * round's keys.
 */
export function applyGameResult(
  bracket: BracketMatchups,
  round: ScoredRound,
  result: TournamentGameResult
): BracketMatchups {
  if (result.region === null) {
    throw new GameDataError("applyGameResult: result has no region", {
      round,
      gameIndex: result.gameIndex,
      winningTeam: result.winningTeam,
    });
  }
  const region: TournamentRegion = result.region;
  const { matchupsKey, nextMatchupsKey } = ROUND_CONFIG[round];
  const nextRegion = nextRegionOf(round, region);
  const slotIndex = Math.floor(result.gameIndex / 2);
  const teamIndex =
    ROUND_CONFIG[round].advance[region]?.teamIndex ?? result.gameIndex % 2;

  const nextRound: RoundGames = bracket[nextMatchupsKey];
  const currentRound: RoundGames = bracket[matchupsKey];
  const nextRoundGames = gamesIn(nextRound, nextRegion);
  const currentRoundGames = gamesIn(currentRound, region);
  const { seed } = result;
  if (!nextRoundGames || !currentRoundGames || seed === undefined) {
    throw new GameDataError("applyGameResult: result does not fit the bracket", {
      round,
      region,
      nextRegion,
      gameIndex: result.gameIndex,
      winningTeam: result.winningTeam,
      seed,
      hasRegionGames: !!currentRoundGames,
      hasNextRegionGames: !!nextRoundGames,
    });
  }

  const nextRegionGames = nextRoundGames.map((g) => g);
  const nextGame = [...nextRegionGames[slotIndex]];
  nextGame[teamIndex] = { team: result.winningTeam, seed };
  nextRegionGames[slotIndex] = nextGame;

  const currentRegionGames = currentRoundGames.map((g) => g);
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
