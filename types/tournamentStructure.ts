export interface TournamentTeam {
  team: string;
  seed: string;
}

export interface TournamentMatchup {
  [region: string]: TournamentTeam[][];
}

export interface Tournament {
  roundTwoPicks: TournamentMatchup;
  roundSweetSixteenPicks: TournamentMatchup;
  roundEliteEightPicks: TournamentMatchup;
  roundFinalFourPicks: {
    eastWest: TournamentTeam[][];
    southMidwest: TournamentTeam[][];
  };
  roundFinalsPicks: {
    championship: TournamentTeam[][];
  };
  champion: {
    champion: TournamentTeam[][];
  };
}
