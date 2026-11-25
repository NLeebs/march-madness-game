export type TournamentTeam = {
  team: string;
  /** A number in the bracket the game builds (`createMatchupsFromSeededArr`); fixtures and picks use strings. */
  seed: string | number;
  win?: boolean;
  score?: number;
  /** Set by `recordRoundScore`: whether the player picked this team for this slot. */
  selected?: boolean;
};
