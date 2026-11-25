export type TournamentTeam = {
  team: string;
  /** A number in the bracket the game builds (`createMatchupsFromSeededArr`); fixtures and picks use strings. */
  seed: string | number;
  win?: boolean;
  score?: number;
};
