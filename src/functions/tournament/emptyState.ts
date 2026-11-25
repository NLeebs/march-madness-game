import type {
  BracketMatchups,
  TournamentPickMatchup,
  TournamentPicks,
} from "@/types";

/** `count` games of two empty pick slots. */
const emptyPickGames = (count: number): TournamentPickMatchup[] =>
  Array.from({ length: count }, () => [
    { team: "", seed: "" },
    { team: "", seed: "" },
  ]);

/** `count` games with no teams yet. */
const emptyGames = (count: number): never[][] =>
  Array.from({ length: count }, (): never[] => []);

/** A fresh bracket with no teams: round one has empty regions and an empty play-in. */
export function emptyBracket(): BracketMatchups {
  return {
    roundOneMatchups: {
      west: [],
      east: [],
      south: [],
      midwest: [],
      playin: {
        elevenSeeds: [],
        sixteenSeeds: [],
      },
    },
    roundTwoMatchups: {
      west: emptyGames(4),
      east: emptyGames(4),
      south: emptyGames(4),
      midwest: emptyGames(4),
    },
    roundSweetSixteenMatchups: {
      west: emptyGames(2),
      east: emptyGames(2),
      south: emptyGames(2),
      midwest: emptyGames(2),
    },
    roundEliteEightMatchups: {
      west: emptyGames(1),
      east: emptyGames(1),
      south: emptyGames(1),
      midwest: emptyGames(1),
    },
    roundFinalFourMatchups: {
      eastWest: emptyGames(1),
      southMidwest: emptyGames(1),
    },
    roundFinalsMatchups: {
      championship: emptyGames(1),
    },
    champion: {
      champion: [[]],
    },
  };
}

/** A fresh set of picks with every slot empty. */
export function emptyPicks(): TournamentPicks {
  return {
    roundTwoPicks: {
      west: emptyPickGames(4),
      east: emptyPickGames(4),
      south: emptyPickGames(4),
      midwest: emptyPickGames(4),
    },
    roundSweetSixteenPicks: {
      west: emptyPickGames(2),
      east: emptyPickGames(2),
      south: emptyPickGames(2),
      midwest: emptyPickGames(2),
    },
    roundEliteEightPicks: {
      west: emptyPickGames(1),
      east: emptyPickGames(1),
      south: emptyPickGames(1),
      midwest: emptyPickGames(1),
    },
    roundFinalFourPicks: {
      eastWest: emptyPickGames(1),
      southMidwest: emptyPickGames(1),
    },
    roundFinalsPicks: {
      championship: emptyPickGames(1),
    },
    champion: {
      champion: [[{ team: "", seed: "" }]],
    },
  };
}
