import { TournamentState } from "@/store/tournamentSlice";
import {
  TournamentPlayerPicks,
  TournamentRoundMatchups,
  TournamentTeam,
  TournamentRound,
  RegionPicks,
  TournamentPickTeam,
  TournamentRegion,
} from "@/types";
import { GameSupabase, PickSupabase } from "@/models/appStatsData";
import { mapPicksRegionAndIndex } from "./mapPicksRegionandIndex";

interface MapTournamentToRowsData {
  bracketId: string;
  tournamentState: TournamentState;
  picksState: TournamentPlayerPicks;
  teamIdMap: Map<string, string>;
  roundIdMap: Map<TournamentRound, string>;
}

export type MappedRowsResult = {
  game: GameSupabase;
  pick: PickSupabase;
}[];

type RoundMapping = {
  roundName: TournamentRound;
  matchups: TournamentRoundMatchups;
  picks: RegionPicks;
};

export function mapTournamentToRows({
  bracketId,
  tournamentState,
  picksState,
  teamIdMap,
  roundIdMap,
}: MapTournamentToRowsData): MappedRowsResult {
  const yearId = tournamentState.yearId;
  const gamesAndPicks: MappedRowsResult = [];

  const getFavoredAndUnderdog = (matchup: TournamentTeam[]) => {
    if (matchup.length !== 2) {
      throw new Error("Matchup must contain exactly 2 teams");
    }

    const seed1 = parseInt(matchup[0].seed);
    const seed2 = parseInt(matchup[1].seed);

    if (seed1 < seed2) {
      return {
        favored: matchup[0],
        underdog: matchup[1],
      };
    } else {
      return {
        favored: matchup[1],
        underdog: matchup[0],
      };
    }
  };

  const processMatchupAndPicksToRow = (
    matchup: TournamentTeam[],
    pick: TournamentPickTeam | undefined,
    roundName: TournamentRound,
    isPlayIn: boolean
  ) => {
    const gameRow = processMatchup(matchup, roundName, isPlayIn);

    let pickRow: PickSupabase | undefined;
    if (!isPlayIn && pick) {
      pickRow = processPick(pick);
    }

    gamesAndPicks.push({ game: gameRow, pick: pickRow });
  };

  const processMatchup = (
    matchup: TournamentTeam[],
    roundName: TournamentRound,
    isPlayIn: boolean
  ) => {
    if (matchup.length !== 2 || !matchup[0].team || !matchup[1].team) {
      throw new Error(`Invalid matchup for game row processing: ${matchup}`);
    }

    const roundId = roundIdMap.get(roundName);
    if (!roundId) {
      throw new Error(`Round ID not found for round: ${roundName}`);
    }

    const { favored, underdog } = getFavoredAndUnderdog(matchup);
    const favoredTeamId = teamIdMap.get(favored.team);
    const underdogTeamId = teamIdMap.get(underdog.team);

    if (!favoredTeamId || !underdogTeamId) {
      throw new Error(
        `Team ID not found for teams: ${favored.team} or ${underdog.team}`
      );
    }

    const winningTeam =
      favored.win ||
      (favored.score &&
        parseInt(favored.score) > parseInt(underdog.score || "0"))
        ? favored
        : underdog;
    const winningTeamId = teamIdMap.get(winningTeam.team);
    if (!winningTeamId) {
      throw new Error(
        `Team ID not found for winning team: ${winningTeam.team}`
      );
    }

    const favoredScore = favored.score ? parseInt(favored.score) : 0;
    const underdogScore = underdog.score ? parseInt(underdog.score) : 0;

    const gameRow: GameSupabase = {
      year_id: yearId,
      round_id: roundId,
      is_play_in: isPlayIn,
      favored_team_id: favoredTeamId,
      favored_team_seed: parseInt(favored.seed),
      favored_team_score: favoredScore,
      underdog_team_id: underdogTeamId,
      underdog_team_seed: parseInt(underdog.seed),
      underdog_team_score: underdogScore,
      winning_team_id: winningTeamId,
    };

    return gameRow;
  };

  const processPick = (pick: TournamentPickTeam) => {
    if (!pick || !pick.team || !pick.seed) {
      throw new Error(`Invalid pick for pick row processing: ${pick}`);
    }

    const pickTeamId = teamIdMap.get(pick.team);
    if (!pickTeamId) {
      throw new Error(`Team ID not found for pick team: ${pick.team}`);
    }

    const pickRow: PickSupabase = {
      bracket_id: bracketId,
      picked_team_id: pickTeamId,
      picked_team_seed: parseInt(pick.seed),
    };

    return pickRow;
  };

  const rounds: RoundMapping[] = [
    {
      roundName: 1,
      matchups: tournamentState.roundOneMatchups,
      picks: picksState.picks.roundTwoPicks,
    },
    {
      roundName: 2,
      matchups: tournamentState.roundTwoMatchups,
      picks: picksState.picks.roundSweetSixteenPicks,
    },
    {
      roundName: "sweet sixteen",
      matchups: tournamentState.roundSweetSixteenMatchups,
      picks: picksState.picks.roundEliteEightPicks,
    },
    {
      roundName: "elite eight",
      matchups: tournamentState.roundEliteEightMatchups,
      picks: picksState.picks.roundFinalFourPicks,
    },
    {
      roundName: "final four",
      matchups: tournamentState.roundFinalFourMatchups,
      picks: picksState.picks.roundFinalsPicks,
    },
    {
      roundName: "finals",
      matchups: tournamentState.roundFinalsMatchups,
      picks: picksState.picks.champion,
    },
  ];

  rounds.forEach((round) => {
    Object.entries(round.matchups).forEach(
      ([region, matchups], matchupIndex) => {
        if (region === "playin") {
          const playinMatchups = matchups as {
            elevenSeeds?: TournamentTeam[][];
            sixteenSeeds?: TournamentTeam[][];
          };
          playinMatchups.elevenSeeds?.forEach((matchup) => {
            processMatchupAndPicksToRow(
              matchup,
              undefined,
              round.roundName,
              true
            );
          });
          playinMatchups.sixteenSeeds?.forEach((matchup) => {
            processMatchupAndPicksToRow(
              matchup,
              undefined,
              round.roundName,
              true
            );
          });
        } else if (Array.isArray(matchups) && matchups.length > 0) {
          const { picksRegion, pickIndex: regionBasedPickIndex } =
            mapPicksRegionAndIndex(round.roundName, region as TournamentRegion);

          const picksForRegion = round.picks[picksRegion];
          if (!picksForRegion) {
            throw new Error(
              `Picks not found for region: ${picksRegion} in round: ${round.roundName}`
            );
          }

          const regionPicks: TournamentPickTeam[] = picksForRegion.flat();

          matchups.forEach((matchup, matchupIndexInRegion) => {
            const finalPickIndex =
              round.roundName === "elite eight" ||
              round.roundName === "final four" ||
              round.roundName === "finals"
                ? regionBasedPickIndex
                : matchupIndexInRegion;

            const pick = regionPicks[finalPickIndex];
            processMatchupAndPicksToRow(matchup, pick, round.roundName, false);
          });
        }
      }
    );
  });

  return gamesAndPicks;
}
