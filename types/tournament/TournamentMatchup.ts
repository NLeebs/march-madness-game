import { SeedRegion, TournamentTeam, TournamentRegion } from "@/types";

export type TournamentMatchup = TournamentTeam[];

export type PlayinMatchup = {
  elevenSeeds: TournamentTeam[][];
  sixteenSeeds: TournamentTeam[][];
};

export type TournamentRoundMatchups = {
  [region in Exclude<TournamentRegion, "playin">]?: TournamentMatchup[];
} & {
  playin?: PlayinMatchup;
};

/** Round one as `buildRoundOneMatchups` builds it: all four regions and the play-in games. */
export type RoundOneMatchups = Record<SeedRegion, TournamentMatchup[]> & {
  playin: PlayinMatchup;
};
