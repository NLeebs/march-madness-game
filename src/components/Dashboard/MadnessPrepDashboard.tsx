"use client";
import React from "react";
import { useMadnessPrep } from "@/src/hooks";
import { LoadingBasketball, StatList } from "@/src/components";

interface MadnessPrepDashboardProps {
  yearId: string;
}

export const MadnessPrepDashboard: React.FC<MadnessPrepDashboardProps> = ({
  yearId,
}) => {
  const {
    topPerformingTeams,
    topPerformingNonPowerConferenceTeams,
    topPickedTeams,
    teamsThatCausedMostUpsets,
    teamsMostUpsetProne,
    firstRoundSeedMatchupUpsetPercentages,
    teamsWithMostChampionships,
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
    isLoadingTeamsInMostFinalFours,
    isLoadingTeamsInMostEliteEights,
    isLoadingTeamsInMostSweetSixteens,
    isLoadingTeamsInMostSecondRounds,
    isLoadingTeamsWithMostTournamentAppearances,
  } = useMadnessPrep(yearId);

  const topPerformingTeamsStats = topPerformingTeams?.map((team) => ({
    team: team.team_name ?? "",
    teamLogoRoute: team.team_logo ?? "",
    stat: team.tournament_points_scored ?? 0,
  }));

  const topPerformingNonPowerConferenceTeamsStats =
    topPerformingNonPowerConferenceTeams?.map((team) => ({
      team: team.team_name ?? "",
      teamLogoRoute: team.team_logo ?? "",
      stat: team.tournament_points_scored ?? 0,
    }));

  const topPickedTeamsStats = topPickedTeams?.map((team) => ({
    team: team.team_name ?? "",
    teamLogoRoute: team.team_logo ?? "",
    stat: team.picks ?? 0,
  }));

  const teamsThatCausedMostUpsetsStats = teamsThatCausedMostUpsets?.map(
    (team) => ({
      team: team.team_name ?? "",
      teamLogoRoute: team.team_logo ?? "",
      stat: team.upsets_caused ?? 0,
    }),
  );

  const teamsMostUpsetProneStats = teamsMostUpsetProne?.map((team) => ({
    team: team.team_name ?? "",
    teamLogoRoute: team.team_logo ?? "",
    stat: team.times_upset ?? 0,
  }));

  const firstRoundSeedMatchupUpsetPercentagesStats =
    firstRoundSeedMatchupUpsetPercentages?.map((seed) => ({
      team: `${seed.higher_seed ?? 0} vs ${seed.lower_seed ?? 0}`,
      stat: `${seed.upset_percentage ?? 0}%`,
    }));

  const teamsWithMostChampionshipsStats = teamsWithMostChampionships?.map(
    (team) => ({
      team: team.team_name ?? "",
      teamLogoRoute: team.team_logo ?? "",
      stat: team.championships ?? 0,
    }),
  );

  const teamsInMostFinalFoursStats = teamsInMostFinalFours?.map((team) => ({
    team: team.team_name ?? "",
    teamLogoRoute: team.team_logo ?? "",
    stat: team.final_fours ?? 0,
  }));

  const teamsInMostEliteEightsStats = teamsInMostEliteEights?.map((team) => ({
    team: team.team_name ?? "",
    teamLogoRoute: team.team_logo ?? "",
    stat: team.elite_eights ?? 0,
  }));

  const teamsInMostSweetSixteensStats = teamsInMostSweetSixteens?.map(
    (team) => ({
      team: team.team_name ?? "",
      teamLogoRoute: team.team_logo ?? "",
      stat: team.sweet_sixteens ?? 0,
    }),
  );

  const teamsInMostSecondRoundsStats = teamsInMostSecondRounds?.map((team) => ({
    team: team.team_name ?? "",
    teamLogoRoute: team.team_logo ?? "",
    stat: team.second_rounds ?? 0,
  }));

  const teamsWithMostTournamentAppearancesStats =
    teamsWithMostTournamentAppearances?.map((team) => ({
      team: team.team_name ?? "",
      teamLogoRoute: team.team_logo ?? "",
      stat: team.tournament_appearances ?? 0,
    }));

  const isLoading =
    !yearId ||
    isLoadingMadnessPrep ||
    isLoadingTopPerformingNonPowerConferenceTeams ||
    isLoadingTopPickedTeams ||
    isLoadingTeamsThatCausedMostUpsets ||
    isLoadingTeamsMostUpsetProne ||
    isLoadingFirstRoundSeedMatchupUpsetPercentages ||
    isLoadingTeamsWithMostChampionships ||
    isLoadingTeamsInMostFinalFours ||
    isLoadingTeamsInMostEliteEights ||
    isLoadingTeamsInMostSweetSixteens ||
    isLoadingTeamsInMostSecondRounds ||
    isLoadingTeamsWithMostTournamentAppearances;

  return (
    <div className="w-full py-4 px-8 max-w-screen-2xl mx-auto">
      {isLoading ? (
        <LoadingBasketball size={150} />
      ) : (
        <>
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatList
              title="Top Teams"
              statLabel="Tourny Pts Scored"
              stats={topPerformingTeamsStats}
            />
            <StatList
              title="Top Cinderellas"
              statLabel="Tourny Pts Scored"
              stats={topPerformingNonPowerConferenceTeamsStats}
            />
            <StatList
              title="Most Picked Teams"
              statLabel="Picks"
              stats={topPickedTeamsStats}
            />
            <StatList
              title="Most Upsets"
              statLabel="Upsets"
              stats={teamsThatCausedMostUpsetsStats}
            />
            <StatList
              title="Most Upset Prone"
              statLabel="Been Upset"
              stats={teamsMostUpsetProneStats}
            />
            <StatList
              title="Upsets By Seeds"
              statLabel="Upsets"
              stats={firstRoundSeedMatchupUpsetPercentagesStats}
            />
            <StatList
              title="Most Titles"
              statLabel="Championships"
              stats={teamsWithMostChampionshipsStats}
            />
            <StatList
              title="Most Final Fours"
              statLabel="Final Fours"
              stats={teamsInMostFinalFoursStats}
            />
            <StatList
              title="Most Elite Eights"
              statLabel="Elite Eights"
              stats={teamsInMostEliteEightsStats}
            />
            <StatList
              title="Most Sweet Sixteens"
              statLabel="Sweet Sixteens"
              stats={teamsInMostSweetSixteensStats}
            />
            <StatList
              title="Most Second Rounds"
              statLabel="Second Rounds"
              stats={teamsInMostSecondRoundsStats}
            />
            <StatList
              title="Most Tournament Appearances"
              statLabel="Appearances"
              stats={teamsWithMostTournamentAppearancesStats}
            />
          </div>
        </>
      )}
    </div>
  );
};
