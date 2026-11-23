import type { ConferenceMap } from "@/models";
import type { GameResult, TeamSchedule } from "@/types";
import { GameDataError } from "@/src/functions/generic";
import type { ScheduledGame } from "@/src/functions/regularSeason/createSeasonSchedule";
import type { TournamentFieldSelection } from "@/src/functions/regularSeason/selectTournamentField";
import type { SeasonSimulation } from "@/src/functions/regularSeason/simulateSeason";

/** [team index A, team index B, A's score, B's score]; A/B in schedule (matchup) order. */
export type SeasonWireGame = [number, number, number, number];

export interface SeasonWire {
  /** = SeasonSimulation.teamArray */
  teams: TeamSchedule[];
  /** 30 weeks, games in schedule order. */
  weeks: SeasonWireGame[][];
  selection: TournamentFieldSelection;
}

export function compactSeason(season: SeasonSimulation): SeasonWire {
  const indexByTeam = new Map<string, number>();
  season.teamArray.forEach(({ team }, i) => indexByTeam.set(team, i));

  const gamesByWeek = new Map<string, TeamSchedule[][]>();
  for (const { weekNumber, matchup } of season.schedule) {
    const games = gamesByWeek.get(weekNumber);
    if (games) games.push(matchup);
    else gamesByWeek.set(weekNumber, [matchup]);
  }

  const weeks = season.weeks.map((results, w) => {
    const matchups = gamesByWeek.get(`week${w + 1}`) ?? [];
    return results.map((result, g): SeasonWireGame => {
      const [a, b] = matchups[g];
      const aIsFavored = result.favoredTeam === a.team;
      const wireGame: SeasonWireGame = [
        indexByTeam.get(a.team) as number,
        indexByTeam.get(b.team) as number,
        aIsFavored ? result.favoredScore : result.underdogScore,
        aIsFavored ? result.underdogScore : result.favoredScore,
      ];
      return wireGame;
    });
  });

  return { teams: season.teamArray, weeks, selection: season.selection };
}

export function expandSeason(
  wire: SeasonWire,
  teamStats: ConferenceMap
): {
  schedule: ScheduledGame[];
  weeks: GameResult[][];
  selection: TournamentFieldSelection;
} {
  const statsOf = (index: number) => {
    const slot = wire.teams[index];
    const stats = slot && teamStats[slot.conference]?.[slot.team];
    if (!stats) {
      throw new GameDataError("A team in the season is missing from the team stats", {
        team: slot?.team,
        conference: slot?.conference,
        teamIndex: index,
      });
    }
    return stats;
  };

  const schedule: ScheduledGame[] = [];
  const weeks = wire.weeks.map((games, w) =>
    games.map(([ia, ib, scoreA, scoreB]): GameResult => {
      const a = statsOf(ia);
      const b = statsOf(ib);
      schedule.push({
        weekNumber: `week${w + 1}`,
        matchup: [wire.teams[ia], wire.teams[ib]],
      });
      const aIsFavored = !(+a.rpi > +b.rpi);
      const [fav, favScore, dog, dogScore] = aIsFavored
        ? [a, scoreA, b, scoreB]
        : [b, scoreB, a, scoreA];
      return {
        favoredTeam: fav.name,
        favoredScore: favScore,
        favoredRPI: +fav.rpi,
        underdogTeam: dog.name,
        underdogScore: dogScore,
        underdogRPI: +dog.rpi,
      };
    })
  );

  return { schedule, weeks, selection: wire.selection };
}
