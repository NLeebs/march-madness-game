import type {
  MatchupsKey,
  PlayinSeedType,
  ScoredRound,
  SeedRegion,
  TournamentPlayerPickRound,
  TournamentRegion,
} from "@/types";

export interface RoundConfigEntry {
  matchupsKey: MatchupsKey;
  nextMatchupsKey: Exclude<MatchupsKey, "roundOneMatchups"> | "champion";
  nextPicksKey: TournamentPlayerPickRound;
  /** Pick rounds cleared by setPick. */
  laterPicksKeys: readonly TournamentPlayerPickRound[];
  /** Where a winner goes when the next round's region differs. Absent = same region. */
  advance: Partial<
    Record<TournamentRegion, { region: TournamentRegion; teamIndex: 0 | 1 }>
  >;
}

export const SCORED_ROUNDS: readonly ScoredRound[] = [
  1,
  2,
  "sweet sixteen",
  "elite eight",
  "final four",
  "finals",
];

export const ROUND_CONFIG: Readonly<Record<ScoredRound, RoundConfigEntry>> = {
  1: {
    matchupsKey: "roundOneMatchups",
    nextMatchupsKey: "roundTwoMatchups",
    nextPicksKey: "roundTwoPicks",
    laterPicksKeys: [
      "roundSweetSixteenPicks",
      "roundEliteEightPicks",
      "roundFinalFourPicks",
      "roundFinalsPicks",
      "champion",
    ],
    advance: {},
  },
  2: {
    matchupsKey: "roundTwoMatchups",
    nextMatchupsKey: "roundSweetSixteenMatchups",
    nextPicksKey: "roundSweetSixteenPicks",
    laterPicksKeys: [
      "roundEliteEightPicks",
      "roundFinalFourPicks",
      "roundFinalsPicks",
      "champion",
    ],
    advance: {},
  },
  "sweet sixteen": {
    matchupsKey: "roundSweetSixteenMatchups",
    nextMatchupsKey: "roundEliteEightMatchups",
    nextPicksKey: "roundEliteEightPicks",
    laterPicksKeys: ["roundFinalFourPicks", "roundFinalsPicks", "champion"],
    advance: {},
  },
  "elite eight": {
    matchupsKey: "roundEliteEightMatchups",
    nextMatchupsKey: "roundFinalFourMatchups",
    nextPicksKey: "roundFinalFourPicks",
    laterPicksKeys: ["roundFinalsPicks", "champion"],
    advance: {
      west: { region: "eastWest", teamIndex: 0 },
      east: { region: "eastWest", teamIndex: 1 },
      south: { region: "southMidwest", teamIndex: 0 },
      midwest: { region: "southMidwest", teamIndex: 1 },
    },
  },
  "final four": {
    matchupsKey: "roundFinalFourMatchups",
    nextMatchupsKey: "roundFinalsMatchups",
    nextPicksKey: "roundFinalsPicks",
    laterPicksKeys: ["champion"],
    advance: {
      eastWest: { region: "championship", teamIndex: 0 },
      southMidwest: { region: "championship", teamIndex: 1 },
    },
  },
  finals: {
    matchupsKey: "roundFinalsMatchups",
    nextMatchupsKey: "champion",
    nextPicksKey: "champion",
    laterPicksKeys: [],
    advance: { championship: { region: "champion", teamIndex: 0 } },
  },
};

export const SEED_REGIONS: readonly SeedRegion[] = [
  "west",
  "east",
  "south",
  "midwest",
];

/** Region a winner of `region` plays in next round. */
export function nextRegionOf(
  round: ScoredRound,
  region: TournamentRegion
): TournamentRegion {
  return ROUND_CONFIG[round].advance[region]?.region ?? region;
}

export const PLAYIN_PLACEHOLDERS: Readonly<
  Record<PlayinSeedType, readonly [string, string]>
> = {
  elevenSeeds: ["playinGameSeed11Game1", "playinGameSeed11Game2"],
  sixteenSeeds: ["playinGameSeed16Game1", "playinGameSeed16Game2"],
};

/** Round one slot (team slot is always [1]) each play-in winner fills. */
export const PLAYIN_ROUND_ONE_SLOTS: Readonly<
  Record<
    PlayinSeedType,
    readonly [
      { region: SeedRegion; game: number },
      { region: SeedRegion; game: number },
    ]
  >
> = {
  elevenSeeds: [
    { region: "south", game: 4 },
    { region: "midwest", game: 4 },
  ],
  sixteenSeeds: [
    { region: "west", game: 0 },
    { region: "east", game: 0 },
  ],
};

export const ALL_PLAYIN_PLACEHOLDERS: readonly string[] = [
  ...PLAYIN_PLACEHOLDERS.sixteenSeeds,
  ...PLAYIN_PLACEHOLDERS.elevenSeeds,
];
