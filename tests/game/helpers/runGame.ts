import React from "react";
import { act } from "@testing-library/react";
import { vi } from "vitest";
import { useSelector } from "react-redux";
import {
  appStateActions,
  tounramentPlayersPicksActions,
  tournamentActions,
} from "@/store";
import { PlayPlayinGames } from "@/src/components/Tournament/PlayPlayinGames";
import { PlayTournamentGames } from "@/src/components/Tournament/PlayTournamentGames";
import { getNextRoundInfo } from "@/src/components/Tournament/TournamentMatchup";
import { SeasonSchedule } from "@/src/components/RegularSeason/SeasonSchedule";
import { PlayRegularSeasonGames } from "@/src/components/RegularSeason/PlayRegularSeasonGames";
import type { AppStore, RootState } from "@/store";
import type { League } from "@/tests/factories";
import type { RegularSeasonTeam, TournamentRegion } from "@/types";
import { renderWithStore } from "./renderWithStore";

const SEASON_WEEKS = 30;
const STEP_MS = 500;
const MAX_STEPS = 10;

/**
 * Plays a whole regular season on a store already configured for the league
 * (see configureStoreForLeague): renders SeasonSchedule (builds the schedule),
 * then PlayRegularSeasonGames, and advances fake timers until weeksPlayed === 30
 * and appState.selectionSunday is true.
 *
 * Contract with the caller:
 * - Fake timers: playSeason switches them on if they are not already on
 *   (vi.useFakeTimers()), and never switches them off. The caller restores real
 *   timers (vi.useRealTimers()) in afterEach.
 * - Math.random: playSeason does not seed it. The caller seeds with
 *   seedMathRandom(seed) before calling and restores afterwards.
 * - Rendered components stay mounted. The caller calls cleanup() afterwards.
 */
export async function playSeason(store: AppStore, league: League): Promise<void> {
  if (!vi.isFakeTimers()) vi.useFakeTimers();
  renderWithStore(
    React.createElement(SeasonSchedule, {
      teamStats: league.teamStats,
      teamArray: store.getState().teamSchedule.teamArray,
    }),
    store,
  );
  renderWithStore(
    React.createElement(PlayRegularSeasonGames, { teamStats: league.teamStats }),
    store,
  );
  for (let i = 0; i < MAX_STEPS; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(STEP_MS);
    });
    const state = store.getState();
    if (
      state.regularSeasonRecords.weeksPlayed === SEASON_WEEKS &&
      state.appState.selectionSunday
    )
      return;
  }
  throw new Error("playSeason: season did not finish");
}

/**
 * Hand-built season records for the league: one entry per team, inserted in
 * league order (conference by conference), so Object.keys(records) order is
 * the league order. `index` is the team's position in that order.
 */
export function buildRecords(
  league: League,
  scoreFor: (team: string, index: number) => { wins: number; score: number },
): Record<string, RegularSeasonTeam> {
  const records: Record<string, RegularSeasonTeam> = {};
  let index = 0;
  for (const teams of Object.values(league.conferenceArrays))
    for (const team of teams) {
      const { wins, score } = scoreFor(team, index);
      records[team] = { wins, losses: 30 - wins, tournamentSelectionScore: score };
      index++;
    }
  return records;
}

/** RPI rank (1 = best) per team name, from the league fixture. */
export function rpiByTeam(league: League): Record<string, number> {
  const rpi: Record<string, number> = {};
  for (const teams of Object.values(league.teamStats))
    for (const [name, stats] of Object.entries(teams)) rpi[name] = Number(stats.rpi);
  return rpi;
}

type Slot = { team: string; seed: string | number };

const REGIONS = ["west", "east", "south", "midwest"] as const;

/**
 * Picks the better seed (team index 0 on a tie) in every game of every round,
 * as clicking it in each TournamentMatchup would. Round one is read from the
 * round-one matchups; later rounds from the picks made in the round before.
 * Needs setRoundOneMatchups to have been dispatched. Play-in placeholders are
 * picked like any other team.
 */
export function pickChalk(store: AppStore): void {
  const rounds = [
    { round: 1, source: () => store.getState().tournament.roundOneMatchups },
    { round: 2, source: () => store.getState().tournamentPlayersPicks.picks.roundTwoPicks },
    { round: "sweet sixteen", source: () => store.getState().tournamentPlayersPicks.picks.roundSweetSixteenPicks },
    { round: "elite eight", source: () => store.getState().tournamentPlayersPicks.picks.roundEliteEightPicks },
    { round: "final four", source: () => store.getState().tournamentPlayersPicks.picks.roundFinalFourPicks },
    { round: "finals", source: () => store.getState().tournamentPlayersPicks.picks.roundFinalsPicks },
  ] as const;
  for (const { round, source } of rounds) {
    const matchupsByRegion = source() as unknown as Record<TournamentRegion | "playin", Slot[][]>;
    for (const region of Object.keys(matchupsByRegion) as (TournamentRegion | "playin")[]) {
      if (region === "playin") continue;
      matchupsByRegion[region].forEach((matchup, index) => {
        const better = Number(matchup[1].seed) < Number(matchup[0].seed) ? 1 : 0;
        const { nextRoundRegion, teamIndex } = getNextRoundInfo(round, region, index);
        store.dispatch(
          tounramentPlayersPicksActions.setPick({
            round,
            region: nextRoundRegion,
            roundIndex: teamIndex,
            team: matchup[better].team,
            seed: String(matchup[better].seed),
            opponent: matchup[1 - better].team,
          }),
        );
      });
    }
  }
}

/** Renders the two drivers under the same conditions App.tsx mounts them. */
function TournamentDrivers() {
  const appState = useSelector((state: RootState) => state.appState);
  return React.createElement(
    React.Fragment,
    null,
    appState.tournament && appState.tournamentPlayPlayinGames
      ? React.createElement(PlayPlayinGames)
      : null,
    appState.tournament && appState.tournamentPlayGames && !appState.tournamentRecap
      ? React.createElement(PlayTournamentGames)
      : null,
  );
}

/**
 * Plays a whole tournament on a store that already holds a field (Selection
 * Sunday has run): activates the tournament, builds round one, picks chalk,
 * starts the play-in games and renders the drivers until tournamentRecap.
 *
 * Contract with the caller (same as playSeason): Math.random is seeded by the
 * caller; rendered components stay mounted, so the caller calls cleanup().
 */
export async function playTournament(store: AppStore): Promise<void> {
  store.dispatch(appStateActions.activateTournament());
  store.dispatch(appStateActions.activateTournamentSelectionStage());
  store.dispatch(tournamentActions.setRoundOneMatchups());
  pickChalk(store);
  store.dispatch(appStateActions.activateTournamentPlayinGamesState());
  await act(async () => {
    renderWithStore(React.createElement(TournamentDrivers), store);
  });
  if (!store.getState().appState.tournamentRecap)
    throw new Error("playTournament: tournament did not finish");
}
