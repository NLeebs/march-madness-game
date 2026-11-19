import {
  ROUND_CONFIG,
  SCORED_ROUNDS,
} from "@/src/functions/tournament/roundConfig";
import type {
  BracketMatchups,
  PlayinMatchup,
  TournamentPickTeam,
  TournamentPicks,
  TournamentRegion,
  TournamentRound,
  TournamentTeam,
} from "@/types";
import type {
  PersistBracketGame,
  PersistBracketPick,
} from "@/models/appStatsData";
import { mapPicksRegionAndIndex } from "./mapPicksRegionandIndex";

interface MapBracketToPayloadInput {
  bracket: BracketMatchups;
  picks: TournamentPicks;
  teamIdMap: Map<string, string>;
  roundIdMap: Map<TournamentRound, string>;
}

/**
 * Turns a played bracket and its picks into the `games` of a persist_bracket
 * payload: one row per played game (play-in games included, with their
 * scores), each carrying the pick for its winner's next-round slot, or null
 * for play-in games. Same favored/underdog and pick-index rules as the legacy
 * mapTournamentToRows.
 */
export function mapBracketToPayloadGames({
  bracket,
  picks,
  teamIdMap,
  roundIdMap,
}: MapBracketToPayloadInput): PersistBracketGame[] {
  const games: PersistBracketGame[] = [];

  const teamIdOf = (team: string, what: string): string => {
    const id = teamIdMap.get(team);
    if (!id) {
      throw new Error(`Team ID not found for ${what}: ${team}`);
    }
    return id;
  };

  const getFavoredAndUnderdog = (matchup: TournamentTeam[]) => {
    if (matchup.length !== 2) {
      throw new Error("Matchup must contain exactly 2 teams");
    }
    return parseInt(matchup[0].seed) < parseInt(matchup[1].seed)
      ? { favored: matchup[0], underdog: matchup[1] }
      : { favored: matchup[1], underdog: matchup[0] };
  };

  const toPick = (pick: TournamentPickTeam): PersistBracketPick => {
    if (!pick.team || !pick.seed) {
      throw new Error(
        `Invalid pick for pick row processing: ${JSON.stringify(pick)}`
      );
    }
    return {
      picked_team_id: teamIdOf(pick.team, "pick team"),
      picked_team_seed: parseInt(pick.seed),
    };
  };

  const addGame = (
    matchup: TournamentTeam[],
    pick: TournamentPickTeam | undefined,
    round: TournamentRound,
    isPlayIn: boolean
  ) => {
    if (matchup.length !== 2 || !matchup[0].team || !matchup[1].team) {
      throw new Error(
        `Invalid matchup for game row processing: ${JSON.stringify(matchup)}`
      );
    }

    const roundId = roundIdMap.get(round);
    if (!roundId) {
      throw new Error(`Round ID not found for round: ${round}`);
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
      (favored.score && Number(favored.score) > Number(underdog.score ?? 0))
        ? favored
        : underdog;

    games.push({
      round_id: roundId,
      is_play_in: isPlayIn,
      favored_team_id: favoredTeamId,
      favored_team_seed: parseInt(favored.seed),
      favored_team_score: Number(favored.score ?? 0),
      underdog_team_id: underdogTeamId,
      underdog_team_seed: parseInt(underdog.seed),
      underdog_team_score: Number(underdog.score ?? 0),
      winning_team_id: teamIdOf(winningTeam.team, "winning team"),
      pick: !isPlayIn && pick ? toPick(pick) : null,
    });
  };

  SCORED_ROUNDS.forEach((round) => {
    const { matchupsKey, nextPicksKey } = ROUND_CONFIG[round];
    const roundPicks = picks[nextPicksKey];

    Object.entries(bracket[matchupsKey]).forEach(([region, matchups]) => {
      if (region === "playin") {
        const playin = matchups as PlayinMatchup;
        playin.elevenSeeds?.forEach((m) => addGame(m, undefined, round, true));
        playin.sixteenSeeds?.forEach((m) => addGame(m, undefined, round, true));
        return;
      }
      if (!Array.isArray(matchups) || matchups.length === 0) return;

      const { picksRegion, pickIndex } = mapPicksRegionAndIndex(
        round,
        region as TournamentRegion
      );
      const picksForRegion = roundPicks[picksRegion];
      if (!picksForRegion) {
        throw new Error(
          `Picks not found for region: ${picksRegion} in round: ${round}`
        );
      }
      const regionPicks: TournamentPickTeam[] = picksForRegion.flat();
      const usesRegionIndex =
        round === "elite eight" || round === "final four" || round === "finals";

      (matchups as TournamentTeam[][]).forEach((matchup, i) => {
        addGame(
          matchup,
          regionPicks[usesRegionIndex ? pickIndex : i],
          round,
          false
        );
      });
    });
  });

  return games;
}
