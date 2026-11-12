import {
  AMOUNT_NONCONFERENCE_GAMES,
  AMOUNT_SEASON_GAMES,
} from "@/src/constants";
import { ConferenceMap } from "@/models";
import { TeamSchedule } from "@/types";

export type ScheduledGame = { weekNumber: string; matchup: TeamSchedule[] };

/**
 * Builds the whole season schedule as an ordered list of games.
 * Does not mutate `teamArray`. Draws `rng` twice per game.
 */
export function createSeasonSchedule(
  teamStats: ConferenceMap,
  teamArray: TeamSchedule[],
  rng: () => number = Math.random
): ScheduledGame[] {
  const games: ScheduledGame[] = [];

  // Pairs teams off (consuming `arr`); returns the remaining team if odd.
  const randomTeamSchedule = (arr: TeamSchedule[], weekNo: number) => {
    while (arr.length >= 2) {
      const indexTeam1 = Math.floor(rng() * arr.length);
      const team1 = arr.splice(indexTeam1, 1)[0];

      const indexTeam2 = Math.floor(rng() * arr.length);
      const team2 = arr.splice(indexTeam2, 1)[0];

      games.push({ weekNumber: `week${weekNo}`, matchup: [team1, team2] });
    }

    if (arr.length > 0) return arr;
  };

  // Grouped once per season; each conference keeps `teamArray` order.
  const teamsByConference = new Map<string, TeamSchedule[]>();
  teamArray.forEach((team) => {
    const confTeams = teamsByConference.get(team.conference);
    if (confTeams) {
      confTeams.push(team);
    } else {
      teamsByConference.set(team.conference, [team]);
    }
  });

  const scheduleNonConferenceGames =(weekNo: number) => {
    randomTeamSchedule([...teamArray], weekNo);
  };

  const scheduleConferenceGames = (weekNo: number) => {
    const leftoverTeamsArr: TeamSchedule[] = [];
    Object.keys(teamStats).forEach((conf) => {
      // randomTeamSchedule consumes its array, so each week gets a fresh copy.
      const confTeams = [...(teamsByConference.get(conf) ?? [])];
      const leftoverTeam = randomTeamSchedule(confTeams, weekNo);
      if (leftoverTeam) {
        leftoverTeamsArr.push(leftoverTeam[0]);
      }
    });
    randomTeamSchedule(leftoverTeamsArr, weekNo);
  };

  for (let i = 1; i <= AMOUNT_NONCONFERENCE_GAMES; i++) {
    scheduleNonConferenceGames(i);
  }
  for (let i = AMOUNT_NONCONFERENCE_GAMES + 1; i <= AMOUNT_SEASON_GAMES; i++) {
    scheduleConferenceGames(i);
  }

  return games;
}
