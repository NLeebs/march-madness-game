import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { emptyBracket } from "@/src/functions/tournament/emptyState";
import { seedTournament } from "@/src/functions/tournament/seedTournament";
import { buildRoundOneMatchups } from "@/src/functions/tournament/buildRoundOneMatchups";
import { ROUND_CONFIG, SEED_REGIONS } from "@/src/functions/tournament/roundConfig";
import { ROUND_POINTS, scoreRound } from "@/src/functions/tournament/scoreRound";
import {
  applyGameResult,
  applyPlayinResult,
  type PlayinGameResult,
} from "@/src/functions/tournament/applyGameResult";
import type { TournamentPlayResult } from "@/src/functions/tournament/simulateTournament";
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
  /** Signed by the server with the season results; the tournament request sends it. */
  fieldToken: string;
  tournamentScoringRulesId: string;
  tournamentTeams: string[];
  tournamentSeeds: Record<SeedRegion, string[]>;
  playinTeams: {
    elevenSeeds: string[];
    sixteenSeeds: string[];
  };
  playerScore: number;
  /** The server's results for this tournament; the drivers replay them. */
  simulation: TournamentPlayResult | null;
}

const initalState: TournamentState = {
  yearId: "",
  fieldToken: "",
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
  ...emptyBracket(),
  playerScore: 0,
  simulation: null,
};

const tournamentSlice = createSlice({
  name: "tournament",
  initialState: initalState,
  reducers: {
    restartGame: () => initalState,
    setYearId(state, action: PayloadAction<string>) {
      state.yearId = action.payload;
    },
    setFieldToken(state, action: PayloadAction<string>) {
      state.fieldToken = action.payload;
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
        state.tournamentSeeds,
        state.playinTeams
      );
      SEED_REGIONS.forEach((region) => {
        state.roundOneMatchups[region] = matchups[region];
      });
      state.roundOneMatchups.playin = matchups.playin;
    },
    setSimulation(state, action: PayloadAction<TournamentPlayResult>) {
      state.simulation = action.payload;
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
      const { round, results } = action.payload;
      const { matchupsKey, nextMatchupsKey } = ROUND_CONFIG[round];
      const next = applyGameResult(state, round, results);
      // Only these two rounds change; writing just them avoids touching every key.
      Object.assign(state, {
        [matchupsKey]: next[matchupsKey],
        [nextMatchupsKey]: next[nextMatchupsKey],
      });
    },
    recordRoundScore(
      state,
      action: PayloadAction<{
        round: ScoredRound;
        winningTeams: string[];
        picks: RegionPicks;
        /**
         * Points the server scored for this round. The drivers always pass it;
         * when absent, the round is scored here with ROUND_POINTS.
         */
        points?: number;
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
      // scoreRound scored exactly next's regions (advanced: next), in this order.
      (Object.keys(next) as (keyof typeof next)[]).forEach((region) => {
        next[region]?.forEach((matchup, i) => {
          matchup.forEach((teamObj, j) => {
            teamObj.selected = correct[region][i][j];
          });
        });
      });
      state.playerScore += action.payload.points ?? points;
    },
  },
});

export const tournamentActions = tournamentSlice.actions;
export default tournamentSlice;
