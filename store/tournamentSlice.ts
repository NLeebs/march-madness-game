import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { seedTournament } from "@/src/functions/tournament/seedTournament";
import { buildRoundOneMatchups } from "@/src/functions/tournament/buildRoundOneMatchups";
import { ROUND_CONFIG, SEED_REGIONS } from "@/src/functions/tournament/roundConfig";
import { ROUND_POINTS, scoreRound } from "@/src/functions/tournament/scoreRound";
import {
  applyGameResult,
  applyPlayinResult,
  type PlayinGameResult,
} from "@/src/functions/tournament/applyGameResult";
import type {
  BracketMatchups,
  RegionPicks,
  ScoredRound,
  SeedRegion,
  TournamentGameResult,
  TournamentRegion,
  TournamentRoundMatchups,
} from "@/types";

export { ROUND_POINTS } from "@/src/functions/tournament/scoreRound";

export interface TournamentState extends BracketMatchups {
  yearId: string;
  tournamentScoringRulesId: string;
  tournamentTeams: string[];
  tournamentSeeds: {
    [region in TournamentRegion]?: string[];
  };
  playinTeams: {
    elevenSeeds: string[];
    sixteenSeeds: string[];
  };
  playerScore: number;
}

const initalState: TournamentState = {
  yearId: "",
  tournamentScoringRulesId: "",
  tournamentTeams: [],
  tournamentSeeds: {
    west: [],
    east: [],
    south: [],
    midwest: [],
  },
  playinTeams: {
    elevenSeeds: [],
    sixteenSeeds: [],
  },
  roundOneMatchups: {
    west: [],
    east: [],
    south: [],
    midwest: [],
    playin: {
      elevenSeeds: [],
      sixteenSeeds: [],
    },
  } as TournamentRoundMatchups,
  roundTwoMatchups: {
    west: [[], [], [], []],
    east: [[], [], [], []],
    south: [[], [], [], []],
    midwest: [[], [], [], []],
  },
  roundSweetSixteenMatchups: {
    west: [[], []],
    east: [[], []],
    south: [[], []],
    midwest: [[], []],
  },
  roundEliteEightMatchups: {
    west: [[]],
    east: [[]],
    south: [[]],
    midwest: [[]],
  },
  roundFinalFourMatchups: {
    eastWest: [[]],
    southMidwest: [[]],
  },
  roundFinalsMatchups: {
    championship: [[]],
  },
  champion: {
    champion: [[]],
  },
  playerScore: 0,
};

const tournamentSlice = createSlice({
  name: "tournament",
  initialState: initalState,
  reducers: {
    restartGame: () => initalState,
    setYearId(state, action: PayloadAction<string>) {
      state.yearId = action.payload;
    },
    setTournamentScoringRulesId(state, action: PayloadAction<string>) {
      state.tournamentScoringRulesId = action.payload;
    },
    addTournamentTeams(state, action: PayloadAction<string[]>) {
      state.tournamentTeams = action.payload;
    },
    setTournamentSeeds(state) {
      const seeds = seedTournament(state.tournamentTeams);
      SEED_REGIONS.forEach((region) => {
        state.tournamentSeeds[region].push(...seeds[region]);
      });
    },
    setPlayinTeams(
      state,
      action: PayloadAction<{ seed: 11 | 16; team: string }>
    ) {
      if (action.payload.seed === 11)
        state.playinTeams.elevenSeeds.push(action.payload.team);
      else if (action.payload.seed === 16)
        state.playinTeams.sixteenSeeds.push(action.payload.team);
    },
    setRoundOneMatchups(state) {
      const matchups = buildRoundOneMatchups(
        state.tournamentSeeds as Record<SeedRegion, string[]>,
        state.playinTeams
      );
      SEED_REGIONS.forEach((region) => {
        state.roundOneMatchups[region] = matchups[region];
      });
      state.roundOneMatchups.playin = matchups.playin;
    },
    setPlayinGameResults(state, action: PayloadAction<PlayinGameResult>) {
      state.roundOneMatchups = applyPlayinResult(
        state.roundOneMatchups,
        action.payload
      );
    },
    setTournamentGameResults(
      state,
      action: PayloadAction<{
        round: ScoredRound;
        results: TournamentGameResult;
      }>
    ) {
      Object.assign(
        state,
        applyGameResult(state, action.payload.round, action.payload.results)
      );
    },
    recordRoundScore(
      state,
      action: PayloadAction<{
        round: ScoredRound;
        winningTeams: string[];
        picks: RegionPicks;
      }>
    ) {
      const { round, winningTeams, picks } = action.payload;
      const nextKey = ROUND_CONFIG[round].nextMatchupsKey;
      const next = state[nextKey] as Omit<TournamentRoundMatchups, "playin">;
      const { correct, points } = scoreRound({
        round,
        advanced: next,
        picks,
        winningTeams,
        points: ROUND_POINTS,
      });
      Object.keys(correct).forEach((region) => {
        next[region].forEach((matchup, i) => {
          matchup.forEach((teamObj, j) => {
            teamObj.selected = correct[region][i][j];
          });
        });
      });
      state.playerScore += points;
    },
  },
});

export const tournamentActions = tournamentSlice.actions;
export default tournamentSlice;
