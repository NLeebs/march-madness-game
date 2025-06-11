import { TournamentTeam, TournamentRegion } from "@/types";

export type TournamentMatchup = TournamentTeam[];

export type PlayinMatchup = {
  elevenSeeds: TournamentTeam[][];
  sixteenSeeds: TournamentTeam[][];
};

export type TournamentRoundMatchups = {
  [region in TournamentRegion]?: TournamentMatchup[];
} & {
  playin?: PlayinMatchup;
};
