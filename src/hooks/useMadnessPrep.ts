import {
  SeedPerformanceSupabase,
  TeamPerformanceSupabase,
} from "@/models/appStatsData";
import { useApiQuery } from "./useApiQuery";

/** One Madness Prep dashboard query: cached under [name, yearId], fetched from `${path}/${yearId}`. */
function usePrepQuery<T>(name: string, path: string, yearId: string, action: string) {
  return useApiQuery<T>([name, yearId], `${path}/${yearId}`, action, {
    enabled: !!yearId,
  });
}

export function useMadnessPrep(yearId: string) {
  const { data: topPerformingTeams, isLoading: isLoadingMadnessPrep } =
    usePrepQuery<TeamPerformanceSupabase[]>(
      "topPerformingTeams",
      "/api/teams/top-performers",
      yearId,
      "fetch top performing teams",
    );

  const {
    data: topPerformingNonPowerConferenceTeams,
    isLoading: isLoadingTopPerformingNonPowerConferenceTeams,
  } = usePrepQuery<TeamPerformanceSupabase[]>(
    "topPerformingNonPowerConferenceTeams",
    "/api/teams/top-performers/non-power-conference",
    yearId,
    "fetch top performing non power conference teams",
  );

  const { data: topPickedTeams, isLoading: isLoadingTopPickedTeams } =
    usePrepQuery<TeamPerformanceSupabase[]>(
      "topPickedTeams",
      "/api/teams/most-picked",
      yearId,
      "fetch top picked teams",
    );

  const {
    data: teamsThatCausedMostUpsets,
    isLoading: isLoadingTeamsThatCausedMostUpsets,
  } = usePrepQuery<TeamPerformanceSupabase[]>(
    "teamsThatCausedMostUpsets",
    "/api/teams/upsets/caused",
    yearId,
    "fetch teams that caused most upsets",
  );

  const { data: teamsMostUpsetProne, isLoading: isLoadingTeamsMostUpsetProne } =
    usePrepQuery<TeamPerformanceSupabase[]>(
      "teamsMostUpsetProne",
      "/api/teams/upsets/prone",
      yearId,
      "fetch teams most upset prone",
    );

  const {
    data: firstRoundSeedMatchupUpsetPercentages,
    isLoading: isLoadingFirstRoundSeedMatchupUpsetPercentages,
  } = usePrepQuery<SeedPerformanceSupabase[]>(
    "firstRoundSeedMatchupUpsetPercentages",
    "/api/seeds/first-round/upset-percentage",
    yearId,
    "fetch first round seed matchup upset percentages",
  );

  const {
    data: teamsWithMostChampionships,
    isLoading: isLoadingTeamsWithMostChampionships,
  } = usePrepQuery<TeamPerformanceSupabase[]>(
    "teamsWithMostChampionships",
    "/api/teams/appearances/championships",
    yearId,
    "fetch teams with most championships",
  );

  const { data: teamsInMostFinals, isLoading: isLoadingTeamsInMostFinals } =
    usePrepQuery<TeamPerformanceSupabase[]>(
      "teamsInMostFinals",
      "/api/teams/appearances/finals",
      yearId,
      "fetch teams in most finals",
    );

  const {
    data: teamsInMostFinalFours,
    isLoading: isLoadingTeamsInMostFinalFours,
  } = usePrepQuery<TeamPerformanceSupabase[]>(
    "teamsInMostFinalFours",
    "/api/teams/appearances/final-fours",
    yearId,
    "fetch teams in most final fours",
  );

  const {
    data: teamsInMostEliteEights,
    isLoading: isLoadingTeamsInMostEliteEights,
  } = usePrepQuery<TeamPerformanceSupabase[]>(
    "teamsInMostEliteEights",
    "/api/teams/appearances/elite-eights",
    yearId,
    "fetch teams in most elite eights",
  );

  const {
    data: teamsInMostSweetSixteens,
    isLoading: isLoadingTeamsInMostSweetSixteens,
  } = usePrepQuery<TeamPerformanceSupabase[]>(
    "teamsInMostSweetSixteens",
    "/api/teams/appearances/sweet-sixteens",
    yearId,
    "fetch teams in most sweet sixteens",
  );

  const {
    data: teamsInMostSecondRounds,
    isLoading: isLoadingTeamsInMostSecondRounds,
  } = usePrepQuery<TeamPerformanceSupabase[]>(
    "teamsInMostSecondRounds",
    "/api/teams/appearances/second-rounds",
    yearId,
    "fetch teams in most second rounds",
  );

  const {
    data: teamsWithMostTournamentAppearances,
    isLoading: isLoadingTeamsWithMostTournamentAppearances,
  } = usePrepQuery<TeamPerformanceSupabase[]>(
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
