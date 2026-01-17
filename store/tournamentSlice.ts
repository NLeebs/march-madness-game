import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createMatchupsFromSeededArr } from "@/src/functions";
import {
  TournamentRoundMatchups,
  TournamentRegion,
  TournamentTeam,
} from "@/types";
import { HIGHEST_SEED } from "@/src/constants";

export interface TournamentState {
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
  roundOneMatchups: TournamentRoundMatchups;
  roundTwoMatchups: TournamentRoundMatchups;
  roundSweetSixteenMatchups: TournamentRoundMatchups;
  roundEliteEightMatchups: TournamentRoundMatchups;
  roundFinalFourMatchups: TournamentRoundMatchups;
  roundFinalsMatchups: TournamentRoundMatchups;
  champion: { [region in TournamentRegion]?: TournamentTeam[][] };
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
    addTournamentTeams(state, action) {
      state.tournamentTeams = action.payload;
    },
    setTournamentSeeds(state) {
      const seedSettingArr = [...state.tournamentTeams];
      const regions = Object.keys(state.tournamentSeeds);
      const numberOfRegions = regions.length;
      for (let i = 1; i <= HIGHEST_SEED; i++) {
        for (let j = 0; j < numberOfRegions; j++) {
          if (i % 2 === 1) {
            if (i === 11 && (j === 2 || j === 3)) {
              state.tournamentSeeds[regions[j]].push(
                `playinGameSeed11Game${j - 1}`
              );
              seedSettingArr.splice(j, 0, "PlayinTeam");
            } else state.tournamentSeeds[regions[j]].push(seedSettingArr[j]);
          } else {
            if (i === 16 && (j === 0 || j === 1)) {
              state.tournamentSeeds[regions[j]].push(
                `playinGameSeed16Game${j + 1}`
              );
            } else
              state.tournamentSeeds[regions[j]].push(
                seedSettingArr[numberOfRegions - (j + 1)]
              );
          }
        }
        seedSettingArr.splice(0, 4);
      }
    },
    setPlayinTeams(state, action) {
      if (action.payload.seed === 11)
        state.playinTeams.elevenSeeds.push(action.payload.team);
      else if (action.payload.seed === 16)
        state.playinTeams.sixteenSeeds.push(action.payload.team);
    },
    setRoundOneMatchups(state) {
      Object.keys(state.tournamentSeeds).forEach((region) => {
        const unorderedMatchupArr = createMatchupsFromSeededArr(
          state.tournamentSeeds[region]
        );
        state.roundOneMatchups[region] = [
          unorderedMatchupArr[0],
          unorderedMatchupArr[7],
          unorderedMatchupArr[4],
          unorderedMatchupArr[3],
          unorderedMatchupArr[5],
          unorderedMatchupArr[2],
          unorderedMatchupArr[6],
          unorderedMatchupArr[1],
        ];
      });
      Object.keys(state.playinTeams).forEach((playinSeed) => {
        let seedNum;
        if (playinSeed === "elevenSeeds") seedNum = 11;
        if (playinSeed === "sixteenSeeds") seedNum = 16;
        state.roundOneMatchups.playin[playinSeed] = createMatchupsFromSeededArr(
          state.playinTeams[playinSeed],
          seedNum
        );
      });
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
      let pointsPerCorrectPick, nextRoundKey;
      if (action.payload.round === 1) {
        pointsPerCorrectPick = 10;
        nextRoundKey = "roundTwoMatchups";
      }
      if (action.payload.round === 2) {
        pointsPerCorrectPick = 20;
        nextRoundKey = "roundSweetSixteenMatchups";
      }
      if (action.payload.round === "sweet sixteen") {
        pointsPerCorrectPick = 40;
        nextRoundKey = "roundEliteEightMatchups";
      }
      if (action.payload.round === "elite eight") {
        pointsPerCorrectPick = 80;
        nextRoundKey = "roundFinalFourMatchups";
      }
      if (action.payload.round === "final four") {
        pointsPerCorrectPick = 160;
        nextRoundKey = "roundFinalsMatchups";
      }
      if (action.payload.round === "finals") {
        pointsPerCorrectPick = 320;
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
