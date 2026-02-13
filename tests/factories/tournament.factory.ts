import { TournamentState } from "@/store/tournamentSlice";
import {
  TournamentPlayerPicks,
  TournamentRound,
  TournamentTeam,
  RegionPicks,
} from "@/types";

export function buildTournamentTeam(
  team: string,
  seed: string,
  overrides: Partial<TournamentTeam> = {}
): TournamentTeam {
  return { team, seed, ...overrides };
}

export function buildMatchup(
  team1: TournamentTeam,
  team2: TournamentTeam
): TournamentTeam[] {
  return [team1, team2];
}

export function buildEmptyRoundMatchups() {
  return { east: [], west: [], south: [], midwest: [] };
}

export function buildEmptyRegionPicks(): RegionPicks {
  return { east: [], west: [], south: [], midwest: [] };
}

export function buildTeamIdMap(teamNames: string[]): Map<string, string> {
  const map = new Map<string, string>();
  teamNames.forEach((name) => map.set(name, `${name}-uuid`));
  return map;
}

export function buildRoundIdMap(): Map<TournamentRound, string> {
  return new Map<TournamentRound, string>([
    [1, "round-1-uuid"],
    [2, "round-2-uuid"],
    ["sweet sixteen", "round-s16-uuid"],
    ["elite eight", "round-e8-uuid"],
    ["final four", "round-f4-uuid"],
    ["finals", "round-finals-uuid"],
  ]);
}

export function buildTournamentState(
  overrides: Partial<TournamentState> = {}
): TournamentState {
  return {
    yearId: "year-uuid-1",
    tournamentScoringRulesId: "scoring-uuid",
    tournamentTeams: [],
    tournamentSeeds: {},
    playinTeams: { elevenSeeds: [], sixteenSeeds: [] },
    roundOneMatchups: buildEmptyRoundMatchups(),
    roundTwoMatchups: buildEmptyRoundMatchups(),
    roundSweetSixteenMatchups: buildEmptyRoundMatchups(),
    roundEliteEightMatchups: buildEmptyRoundMatchups(),
    roundFinalFourMatchups: {},
    roundFinalsMatchups: {},
    champion: {},
    playerScore: 0,
    ...overrides,
  };
}

export function buildPicksState(
  overrides: Partial<TournamentPlayerPicks["picks"]> = {}
): TournamentPlayerPicks {
  return {
    picks: {
      roundTwoPicks: buildEmptyRegionPicks(),
      roundSweetSixteenPicks: buildEmptyRegionPicks(),
      roundEliteEightPicks: buildEmptyRegionPicks(),
      roundFinalFourPicks: {},
      roundFinalsPicks: {},
      champion: {},
      ...overrides,
    },
  };
}
