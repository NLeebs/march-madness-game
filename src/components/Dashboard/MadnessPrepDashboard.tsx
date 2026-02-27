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
    isLoadingMadnessPrep,
    isLoadingTopPerformingNonPowerConferenceTeams,
    isLoadingTopPickedTeams,
    isLoadingTeamsThatCausedMostUpsets,
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

  const isLoading =
    !yearId ||
    isLoadingMadnessPrep ||
    isLoadingTopPerformingNonPowerConferenceTeams ||
    isLoadingTopPickedTeams ||
    isLoadingTeamsThatCausedMostUpsets;

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
              stats={[]}
            />
            <StatList
              title="Worst Seed Matchups"
              statLabel="Upsets"
              stats={[]}
            />
            <StatList
              title="Most Championships"
              statLabel="Championships"
              stats={[]}
            />
            <StatList
              title="Most Final Four Appearances"
              statLabel="Final Fours"
              stats={[]}
            />
            <StatList
              title="Most Elite Eight Appearances"
              statLabel="Elite Eights"
              stats={[]}
            />
            <StatList
              title="Most Sweet Sixteen Appearances"
              statLabel="Sweet Sixteens"
              stats={[]}
            />
            <StatList
              title="Most Round Two Appearances"
              statLabel="Round Two Appearances"
              stats={[]}
            />
            <StatList
              title="Most Tournament Appearances"
              statLabel="Tournament Appearances"
              stats={[]}
            />
          </div>
        </>
      )}
    </div>
  );
};
