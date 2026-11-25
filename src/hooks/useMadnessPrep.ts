import type {
  getFirstRoundSeedMatchupUpsetPercentageByYearId,
  getTeamsInMostEliteEightsByYear,
  getTeamsInMostFinalFoursByYear,
  getTeamsInMostFinalsByYear,
  getTeamsInMostSecondRoundsByYear,
  getTeamsInMostSweetSixteensByYear,
  getTeamsMostUpsetProneByYearId,
  getTeamsThatCausedMostUpsetsByYearId,
  getTeamsWithMostChampionshipsByYear,
  getTeamsWithMostTournamentAppearancesByYear,
  getTopPerformingNonPowerConferenceTeamsByYear,
  getTopPerformingTeamsByYear,
  getTopPickedTeamsByYear,
} from "@/application/useCases";
import { useApiQuery, type ResultOf } from "./useApiQuery";

/** One Madness Prep dashboard query: cached under [name, yearId], fetched from `${path}/${yearId}`. */
function usePrepQuery<T>(name: string, path: string, yearId: string, action: string) {
  return useApiQuery<T>([name, yearId], `${path}/${yearId}`, action, {
    enabled: !!yearId,
  });
}

export function useMadnessPrep(yearId: string) {
  const { data: topPerformingTeams, isLoading: isLoadingMadnessPrep } =
    usePrepQuery<ResultOf<typeof getTopPerformingTeamsByYear>>(
      "topPerformingTeams",
      "/api/teams/top-performers",
      yearId,
      "fetch top performing teams",
    );

  const {
    data: topPerformingNonPowerConferenceTeams,
    isLoading: isLoadingTopPerformingNonPowerConferenceTeams,
  } = usePrepQuery<ResultOf<typeof getTopPerformingNonPowerConferenceTeamsByYear>>(
    "topPerformingNonPowerConferenceTeams",
    "/api/teams/top-performers/non-power-conference",
    yearId,
    "fetch top performing non power conference teams",
  );

  const { data: topPickedTeams, isLoading: isLoadingTopPickedTeams } =
    usePrepQuery<ResultOf<typeof getTopPickedTeamsByYear>>(
      "topPickedTeams",
      "/api/teams/most-picked",
      yearId,
      "fetch top picked teams",
    );

  const {
    data: teamsThatCausedMostUpsets,
    isLoading: isLoadingTeamsThatCausedMostUpsets,
  } = usePrepQuery<ResultOf<typeof getTeamsThatCausedMostUpsetsByYearId>>(
    "teamsThatCausedMostUpsets",
    "/api/teams/upsets/caused",
    yearId,
    "fetch teams that caused most upsets",
  );

  const { data: teamsMostUpsetProne, isLoading: isLoadingTeamsMostUpsetProne } =
    usePrepQuery<ResultOf<typeof getTeamsMostUpsetProneByYearId>>(
      "teamsMostUpsetProne",
      "/api/teams/upsets/prone",
      yearId,
      "fetch teams most upset prone",
    );

  const {
    data: firstRoundSeedMatchupUpsetPercentages,
    isLoading: isLoadingFirstRoundSeedMatchupUpsetPercentages,
  } = usePrepQuery<ResultOf<typeof getFirstRoundSeedMatchupUpsetPercentageByYearId>>(
    "firstRoundSeedMatchupUpsetPercentages",
    "/api/seeds/first-round/upset-percentage",
    yearId,
    "fetch first round seed matchup upset percentages",
  );

  const {
    data: teamsWithMostChampionships,
    isLoading: isLoadingTeamsWithMostChampionships,
  } = usePrepQuery<ResultOf<typeof getTeamsWithMostChampionshipsByYear>>(
    "teamsWithMostChampionships",
    "/api/teams/appearances/championships",
    yearId,
    "fetch teams with most championships",
  );

  const { data: teamsInMostFinals, isLoading: isLoadingTeamsInMostFinals } =
    usePrepQuery<ResultOf<typeof getTeamsInMostFinalsByYear>>(
      "teamsInMostFinals",
      "/api/teams/appearances/finals",
      yearId,
      "fetch teams in most finals",
    );

  const {
    data: teamsInMostFinalFours,
    isLoading: isLoadingTeamsInMostFinalFours,
  } = usePrepQuery<ResultOf<typeof getTeamsInMostFinalFoursByYear>>(
    "teamsInMostFinalFours",
    "/api/teams/appearances/final-fours",
    yearId,
    "fetch teams in most final fours",
  );

  const {
    data: teamsInMostEliteEights,
    isLoading: isLoadingTeamsInMostEliteEights,
  } = usePrepQuery<ResultOf<typeof getTeamsInMostEliteEightsByYear>>(
    "teamsInMostEliteEights",
    "/api/teams/appearances/elite-eights",
    yearId,
    "fetch teams in most elite eights",
  );

  const {
    data: teamsInMostSweetSixteens,
    isLoading: isLoadingTeamsInMostSweetSixteens,
  } = usePrepQuery<ResultOf<typeof getTeamsInMostSweetSixteensByYear>>(
    "teamsInMostSweetSixteens",
    "/api/teams/appearances/sweet-sixteens",
    yearId,
    "fetch teams in most sweet sixteens",
  );

  const {
    data: teamsInMostSecondRounds,
    isLoading: isLoadingTeamsInMostSecondRounds,
  } = usePrepQuery<ResultOf<typeof getTeamsInMostSecondRoundsByYear>>(
    "teamsInMostSecondRounds",
    "/api/teams/appearances/second-rounds",
    yearId,
    "fetch teams in most second rounds",
  );

  const {
    data: teamsWithMostTournamentAppearances,
    isLoading: isLoadingTeamsWithMostTournamentAppearances,
  } = usePrepQuery<ResultOf<typeof getTeamsWithMostTournamentAppearancesByYear>>(
    "teamsWithMostTournamentAppearances",
    "/api/teams/appearances",
    yearId,
    "fetch teams with most tournament appearances",
  );

  return {
    topPerformingTeams,
    topPerformingNonPowerConferenceTeams,
    topPickedTeams,
    teamsThatCausedMostUpsets,
    teamsMostUpsetProne,
    firstRoundSeedMatchupUpsetPercentages,
    teamsWithMostChampionships,
    teamsInMostFinals,
    teamsInMostFinalFours,
    teamsInMostEliteEights,
    teamsInMostSweetSixteens,
    teamsInMostSecondRounds,
    teamsWithMostTournamentAppearances,
    isLoadingMadnessPrep,
    isLoadingTopPerformingNonPowerConferenceTeams,
    isLoadingTopPickedTeams,
    isLoadingTeamsThatCausedMostUpsets,
    isLoadingTeamsMostUpsetProne,
    isLoadingFirstRoundSeedMatchupUpsetPercentages,
    isLoadingTeamsWithMostChampionships,
    isLoadingTeamsInMostFinals,
    isLoadingTeamsInMostFinalFours,
    isLoadingTeamsInMostEliteEights,
    isLoadingTeamsInMostSweetSixteens,
    isLoadingTeamsInMostSecondRounds,
    isLoadingTeamsWithMostTournamentAppearances,
  };
}
