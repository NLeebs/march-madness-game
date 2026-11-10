import {
  NUMBER_OF_AT_LARGE_TEAMS,
  NUMBER_OF_AT_LARGE_TEAMS_PLAYINS,
  NUMBER_OF_CONF_CHAMP_PLAYINS,
} from "@/src/constants";
import { ConferenceArrays, RegularSeasonTeam } from "@/types";

export type TournamentFieldSelection = {
  /** One champion per conference, in conference-key order. */
  conferenceChampions: string[];
  /** 16-seed play-in teams in dispatch order (lowest-scoring champion first). */
  sixteenSeedPlayins: string[];
  /** 11-seed play-in teams in dispatch order. */
  elevenSeedPlayins: string[];
  /** Teams in the main field, sorted by selection score. */
  field: string[];
};

/**
 * Picks the tournament field from the final regular season records.
 * Pure: does not mutate its inputs. Ties resolve by stable sort: conference
 * champions over conferenceArrays[conference] order, everything else over
 * Object.keys(records) order. Assumes every conference has at least two
 * teams, every team has a record, and there are enough non-champions for
 * the at-large spots (see DIAGNOSIS findings 34 and 39).
 */
export function selectTournamentField(
  records: Record<string, RegularSeasonTeam>,
  conferenceArrays: ConferenceArrays
): TournamentFieldSelection {
  const sortByTournamentScore = (arr: string[]) =>
    [...arr].sort(
      (a, b) =>
        records[b].tournamentSelectionScore -
        records[a].tournamentSelectionScore
    );
  const sortByWins = (arr: string[]) =>
    [...arr].sort((a, b) => records[b].wins - records[a].wins);

  const confChampion = (conference: string) => {
    const sortedByWins = sortByWins(conferenceArrays[conference]);
    if (records[sortedByWins[0]].wins > records[sortedByWins[1]].wins) {
      return sortedByWins[0];
    }
    const winTieArr = sortedByWins.filter(
      (team) => records[team].wins === records[sortedByWins[0]].wins
    );
    return sortByTournamentScore(winTieArr)[0];
  };

  const totalTeams = Object.keys(records);
  const conferenceChampions: string[] = [];
  Object.keys(conferenceArrays).forEach((conf) => {
    const champ = confChampion(conf);
    conferenceChampions.push(champ);
    totalTeams.splice(totalTeams.indexOf(champ), 1);
  });

  // Lowest-scoring champions go to the 16-seed play-ins.
  const remainingChampions = sortByTournamentScore(conferenceChampions);
  const sixteenSeedPlayins: string[] = [];
  for (let i = 1; i <= NUMBER_OF_CONF_CHAMP_PLAYINS; i++) {
    sixteenSeedPlayins.push(
      remainingChampions.splice(remainingChampions.length - 1, 1)[0]
    );
  }

  // Top remaining teams are at-large; the last few go to the 11-seed play-ins.
  const atLargeTeams = sortByTournamentScore(totalTeams);
  const elevenSeedPlayins: string[] = [];
  const fieldTeams = remainingChampions;
  for (let i = 0; i < NUMBER_OF_AT_LARGE_TEAMS; i++) {
    if (i < NUMBER_OF_AT_LARGE_TEAMS - NUMBER_OF_AT_LARGE_TEAMS_PLAYINS)
      fieldTeams.push(atLargeTeams[i]);
    else elevenSeedPlayins.push(atLargeTeams[i]);
  }

  return {
    conferenceChampions,
    sixteenSeedPlayins,
    elevenSeedPlayins,
    field: sortByTournamentScore(fieldTeams),
  };
}
