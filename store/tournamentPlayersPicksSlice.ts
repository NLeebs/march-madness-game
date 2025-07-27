import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  TournamentPlayerPicks,
  Pick,
  PlayInGameWinner,
  TournamentPlayerPickRound,
} from "@/types";

const initalState: TournamentPlayerPicks =
  process.env.NEXT_PUBLIC_APP_MODE !== "dev"
    ? {
        picks: {
          roundTwoPicks: {
            west: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            east: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            south: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            midwest: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
          },
          roundSweetSixteenPicks: {
            west: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            east: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            south: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            midwest: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
          },
          roundEliteEightPicks: {
            west: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            east: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            south: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            midwest: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
          },
          roundFinalFourPicks: {
            eastWest: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
            southMidwest: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
          },
          roundFinalsPicks: {
            championship: [
              [
                { team: "", seed: "" },
                { team: "", seed: "" },
              ],
            ],
          },
          champion: {
            champion: [[{ team: "", seed: "" }]],
          },
        },
      }
    : {
        picks: {
          roundTwoPicks: {
            east: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "UCF", seed: "8" },
              ],
              [
                { team: "Missouri", seed: "5" },
                { team: "East Tennessee State", seed: "13" },
              ],
              [
                { team: "Indiana", seed: "6" },
                { team: "Texas", seed: "3" },
              ],
              [
                { team: "Michigan State", seed: "10" },
                { team: "UCLA", seed: "2" },
              ],
            ],
            west: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "UCF", seed: "8" },
              ],
              [
                { team: "Missouri", seed: "5" },
                { team: "East Tennessee State", seed: "13" },
              ],
              [
                { team: "Indiana", seed: "6" },
                { team: "Texas", seed: "3" },
              ],
              [
                { team: "Michigan State", seed: "10" },
                { team: "UCLA", seed: "2" },
              ],
            ],
            south: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "UCF", seed: "8" },
              ],
              [
                { team: "Missouri", seed: "5" },
                { team: "East Tennessee State", seed: "13" },
              ],
              [
                { team: "Indiana", seed: "6" },
                { team: "Texas", seed: "3" },
              ],
              [
                { team: "Michigan State", seed: "10" },
                { team: "UCLA", seed: "2" },
              ],
            ],
            midwest: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "UCF", seed: "8" },
              ],
              [
                { team: "Missouri", seed: "5" },
                { team: "East Tennessee State", seed: "13" },
              ],
              [
                { team: "Indiana", seed: "6" },
                { team: "Texas", seed: "3" },
              ],
              [
                { team: "Michigan State", seed: "10" },
                { team: "UCLA", seed: "2" },
              ],
            ],
          },
          roundSweetSixteenPicks: {
            east: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Missouri", seed: "5" },
              ],
              [
                { team: "Texas", seed: "3" },
                { team: "UCLA", seed: "2" },
              ],
            ],
            west: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Missouri", seed: "5" },
              ],
              [
                { team: "Texas", seed: "3" },
                { team: "UCLA", seed: "2" },
              ],
            ],
            south: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Missouri", seed: "5" },
              ],
              [
                { team: "Texas", seed: "3" },
                { team: "UCLA", seed: "2" },
              ],
            ],
            midwest: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Missouri", seed: "5" },
              ],
              [
                { team: "Texas", seed: "3" },
                { team: "UCLA", seed: "2" },
              ],
            ],
          },
          roundEliteEightPicks: {
            east: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Texas", seed: "3" },
              ],
            ],
            west: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Texas", seed: "3" },
              ],
            ],
            south: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Texas", seed: "3" },
              ],
            ],
            midwest: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Texas", seed: "3" },
              ],
            ],
          },
          roundFinalFourPicks: {
            eastWest: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Ohio State", seed: "1" },
              ],
            ],
            southMidwest: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Ohio State", seed: "1" },
              ],
            ],
          },
          roundFinalsPicks: {
            championship: [
              [
                { team: "Ohio State", seed: "1" },
                { team: "Ohio State", seed: "1" },
              ],
            ],
          },
          champion: {
            champion: [[{ team: "Ohio State", seed: "1" }]],
          },
        },
      };

const tournamentPlayersPicksSlice = createSlice({
  name: "tournamentPlayersPicks",
  initialState: initalState,
  reducers: {
    restartGame: () => initalState,
    setPick(state, action: PayloadAction<Pick>) {
      let whichRound: TournamentPlayerPickRound;
      let removeRoundPicksArr: TournamentPlayerPickRound[];
      if (action.payload.round === 1) {
        whichRound = "roundTwoPicks";
        removeRoundPicksArr = [
          "roundSweetSixteenPicks",
          "roundEliteEightPicks",
          "roundFinalFourPicks",
          "roundFinalsPicks",
          "champion",
        ];
      }
      if (action.payload.round === 2) {
        whichRound = "roundSweetSixteenPicks";
        removeRoundPicksArr = [
          "roundEliteEightPicks",
          "roundFinalFourPicks",
          "roundFinalsPicks",
          "champion",
        ];
      }
      if (action.payload.round === "sweet sixteen") {
        whichRound = "roundEliteEightPicks";
        removeRoundPicksArr = [
          "roundFinalFourPicks",
          "roundFinalsPicks",
          "champion",
        ];
      }
      if (action.payload.round === "elite eight") {
        whichRound = "roundFinalFourPicks";
        removeRoundPicksArr = ["roundFinalsPicks", "champion"];
      }
      if (action.payload.round === "final four") {
        whichRound = "roundFinalsPicks";
        removeRoundPicksArr = ["champion"];
      }
      if (action.payload.round === "finals") {
        whichRound = "champion";
        removeRoundPicksArr = [];
      }

      // Set Pick
      if (action.payload.team !== "") {
        state.picks[whichRound][action.payload.region][
          Math.floor(+action.payload.roundIndex / 2)
        ][+action.payload.roundIndex % 2].team = action.payload.team;
        state.picks[whichRound][action.payload.region][
          Math.floor(+action.payload.roundIndex / 2)
        ][+action.payload.roundIndex % 2].seed = action.payload.seed;
      }

      // Remove erroneous future picks
      if (action.payload.opponent !== "") {
        removeRoundPicksArr.forEach((round) => {
          Object.keys(state.picks[round]).forEach((region) => {
            state.picks[round][region].forEach((matchup) => {
              for (const teamObj of matchup) {
                if (teamObj.team === action.payload.opponent) {
                  teamObj.team = "";
                  teamObj.seed = "";
                }
              }
            });
          });
        });
      }
    },
    replacePlayinPicksWithWinner(
      state,
      action: PayloadAction<PlayInGameWinner>
    ) {
      let playinTeamPlaceholder;
      if (action.payload.seedType === "sixteenSeeds") {
        playinTeamPlaceholder =
          action.payload.gameIndex === 0
            ? "playinGameSeed16Game1"
            : "playinGameSeed16Game2";
      } else {
        playinTeamPlaceholder =
          action.payload.gameIndex === 0
            ? "playinGameSeed11Game1"
            : "playinGameSeed11Game2";
      }

      Object.keys(state.picks).forEach((roundPicks) => {
        Object.keys(state.picks[roundPicks]).forEach((region) => {
          state.picks[roundPicks][region].forEach((matchup) => {
            for (const teamObj of matchup) {
              if (teamObj.team === playinTeamPlaceholder) {
                teamObj.team = action.payload.winningTeam;
              }
            }
          });
        });
      });
    },
  },
});

export const tounramentPlayersPicksActions =
  tournamentPlayersPicksSlice.actions;
export default tournamentPlayersPicksSlice;
