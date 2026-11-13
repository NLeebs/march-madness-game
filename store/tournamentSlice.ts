import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { seedTournament } from "@/src/functions/tournament/seedTournament";
import { buildRoundOneMatchups } from "@/src/functions/tournament/buildRoundOneMatchups";
import { SEED_REGIONS } from "@/src/functions/tournament/roundConfig";
import type {
  BracketMatchups,
  SeedRegion,
  TournamentRegion,
  TournamentRoundMatchups,
} from "@/types";

/** Points awarded per correct pick, by the round whose results are scored. */
export const ROUND_POINTS: Readonly<
  Record<1 | 2 | "sweet sixteen" | "elite eight" | "final four" | "finals", number>
> = {
  1: 10,
  2: 20,
  "sweet sixteen": 40,
  "elite eight": 80,
  "final four": 160,
  finals: 320,
};

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
    setPlayinGameResults(state, action) {
      // Set round one matchup to winning team
      if (action.payload.seedType === "elevenSeeds") {
        if (action.payload.gameIndex === 0)
          state.roundOneMatchups.south[4][1].team = action.payload.winningTeam;
        else
          state.roundOneMatchups.midwest[4][1].team =
            action.payload.winningTeam;
      } else {
        if (action.payload.gameIndex === 0)
          state.roundOneMatchups.west[0][1].team = action.payload.winningTeam;
        else
          state.roundOneMatchups.east[0][1].team = action.payload.winningTeam;
      }

      for (let i = 0; i <= 1; i++) {
        if (
          state.roundOneMatchups.playin[action.payload.seedType][
            action.payload.gameIndex
          ][i].team === action.payload.winningTeam
        ) {
          state.roundOneMatchups.playin[action.payload.seedType][
            action.payload.gameIndex
          ][i].score = action.payload.winningScore;
          state.roundOneMatchups.playin[action.payload.seedType][
            action.payload.gameIndex
          ][i].win = true;
        } else {
          state.roundOneMatchups.playin[action.payload.seedType][
            action.payload.gameIndex
          ][i].score = action.payload.losingScore;
          state.roundOneMatchups.playin[action.payload.seedType][
            action.payload.gameIndex
          ][i].win = false;
        }
      }
    },
    setTournamentGameResults(state, action) {
      let nextRoundKey, currentRoundKey;
      if (action.payload.round === 1) {
        nextRoundKey = "roundTwoMatchups";
        currentRoundKey = "roundOneMatchups";
      }
      if (action.payload.round === 2) {
        nextRoundKey = "roundSweetSixteenMatchups";
        currentRoundKey = "roundTwoMatchups";
      }
      if (action.payload.round === "sweet sixteen") {
        nextRoundKey = "roundEliteEightMatchups";
        currentRoundKey = "roundSweetSixteenMatchups";
      }
      if (action.payload.round === "elite eight") {
        nextRoundKey = "roundFinalFourMatchups";
        currentRoundKey = "roundEliteEightMatchups";
      }
      if (action.payload.round === "final four") {
        nextRoundKey = "roundFinalsMatchups";
        currentRoundKey = "roundFinalFourMatchups";
      }
      if (action.payload.round === "finals") {
        nextRoundKey = "champion";
        currentRoundKey = "roundFinalsMatchups";
      }

      let nextRegion = action.payload.results.region;
      if (action.payload.round === "elite eight")
        nextRegion === "east" || nextRegion === "west"
          ? (nextRegion = "eastWest")
          : (nextRegion = "southMidwest");
      if (action.payload.round === "final four") nextRegion = "championship";
      if (action.payload.round === "finals") nextRegion = "champion";

      state[nextRoundKey][nextRegion][
        Math.floor(action.payload.results.gameIndex / 2)
      ].push({
        team: action.payload.results.winningTeam,
        seed: action.payload.results.seed,
      });

      for (let i = 0; i <= 1; i++) {
        if (
          state[currentRoundKey][action.payload.results.region][
            action.payload.results.gameIndex
          ][i].team === action.payload.results.winningTeam
        ) {
          state[currentRoundKey][action.payload.results.region][
            action.payload.results.gameIndex
          ][i].score = action.payload.results.winningScore;
          state[currentRoundKey][action.payload.results.region][
            action.payload.results.gameIndex
          ][i].win = true;
        } else {
          state[currentRoundKey][action.payload.results.region][
            action.payload.results.gameIndex
          ][i].score = action.payload.results.losingScore;
          state[currentRoundKey][action.payload.results.region][
            action.payload.results.gameIndex
          ][i].win = false;
        }
      }
    },
    comparePicksAndGames(state, action) {
      let nextRoundKey;
      const pointsPerCorrectPick = ROUND_POINTS[action.payload.round];
      if (action.payload.round === 1) {
        nextRoundKey = "roundTwoMatchups";
      }
      if (action.payload.round === 2) {
        nextRoundKey = "roundSweetSixteenMatchups";
      }
      if (action.payload.round === "sweet sixteen") {
        nextRoundKey = "roundEliteEightMatchups";
      }
      if (action.payload.round === "elite eight") {
        nextRoundKey = "roundFinalFourMatchups";
      }
      if (action.payload.round === "final four") {
        nextRoundKey = "roundFinalsMatchups";
      }
      if (action.payload.round === "finals") {
        nextRoundKey = "champion";
      }

      Object.keys(state[nextRoundKey]).forEach((region) => {
        state[nextRoundKey][region].forEach((matchup, i) => {
          matchup.forEach((teamObj, j) => {
            if (
              action.payload.winningTeams.includes(
                action.payload.picks[region][i][j].team
              )
            ) {
              teamObj.selected = true;
              state.playerScore += pointsPerCorrectPick;
            } else {
              teamObj.selected = false;
            }
          });
        });
      });
    },
  },
});

export const tournamentActions = tournamentSlice.actions;
export default tournamentSlice;
