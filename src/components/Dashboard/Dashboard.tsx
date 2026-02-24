"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  useAuth,
  useConference,
  useUserBracketsByYearId,
  useProfile,
  useTeam,
  useTopPickedTeamsByUser,
  useUserStatisticsByYearId,
  useYears,
} from "@/src/hooks";
import {
  LineSpacer,
  LoadingBasketball,
  SelectField,
  StatBubble,
  StatList,
  UserBracketChart,
} from "@/src/components";
import { PRIMARY_COLOR, SECONDARY_COLOR } from "@/src/constants";

export const Dashboard = () => {
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const { user } = useAuth();

  const { data: profileData, isLoading: isLoadingProfile } = useProfile(
    user?.id,
  );

  const { data: years, isLoading: isLoadingYears } = useYears();
  const { data: userBrackets, isLoading: isLoadingUserBracketsByYearId } =
    useUserBracketsByYearId(user?.id, selectedYearId);

  const {
    isLoadingUserStatisticsByYearId,
    highScore,
    lowScore,
    averageScore,
    totalBrackets,
    totalPicks,
    totalCorrectPicks,
    correctPickPercentage,
    totalFirstRoundUpsetsPicked,
    totalFirstRoundUpsetsCorrect,
    firstRoundUpsetsCorrectPercentage,
    lastTenBracketAverage,
    lastThreeBracketAverage,
    championCorrectPercentage,
    finalFourCorrectPercentage,
    eliteEightCorrectPercentage,
    sweetSixteenCorrectPercentage,
    roundTwoCorrectPercentage,
    roundOneCorrectPercentage,
    topPickedChampionId,
    totalTopPickedChampionPicks,
    topPickedConferenceId,
    totalTopPickedConferencePicks,
  } = useUserStatisticsByYearId(user?.id, selectedYearId);

  const { data: topPickedChampion, isLoading: isLoadingTopPickedChampion } =
    useTeam(topPickedChampionId);

  const { data: topPickedTeams, isLoading: isLoadingTopPickedTeams } =
    useTopPickedTeamsByUser(user?.id, selectedYearId);

  const { data: topPickedConference, isLoading: isLoadingTopPickedConference } =
    useConference(topPickedConferenceId);

  useEffect(() => {
    if (years?.length && !selectedYearId) {
      const latestYearId = years[years.length - 1].id;
      setSelectedYearId(latestYearId);
    }
  }, [years, selectedYearId]);

  const handleSelectYear = (year: string) => {
    setSelectedYearId(year);
  };

  const isLoading =
    isLoadingProfile ||
    isLoadingYears ||
    isLoadingUserBracketsByYearId ||
    isLoadingUserStatisticsByYearId ||
    isLoadingTopPickedChampion ||
    isLoadingTopPickedConference;

  return (
    <div className="w-full py-4 px-8 max-w-screen-2xl mx-auto">
      {isLoading ? (
        <LoadingBasketball size={150} />
      ) : (
        <div className="w-full flex flex-col justify-start items-start flex-wrap">
          <h1 className="text-2xl font-bold normal-case">
            Welcome {profileData?.username}
          </h1>
          <SelectField
            label="Select a year"
            popupLabel="Year"
            placeholder="Select Year"
            value={selectedYearId}
            options={
              years?.map((year: { year: string; id: string }) => ({
                label: year.year,
                value: year.id,
              })) || []
            }
            onValueChange={handleSelectYear}
            containerClassName="mt-4"
            selectClassName="w-36 bg-white"
          />
          <LineSpacer lineColor={SECONDARY_COLOR} />
          <div className="w-full flex sm:flex-row flex-col gap-4">
            <div className="w-full flex flex-col gap-4">
              {userBrackets ? (
                <UserBracketChart
                  data={userBrackets}
                  lineColor={PRIMARY_COLOR}
                />
              ) : (
                <div className="w-full h-full flex justify-center items-center">
                  <p>Play some games!</p>
                </div>
              )}
              <div className="w-full flex flex-col gap-4">
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-blue-50 rounded-md">
                  <StatBubble statLabel="High Score" stat={highScore} />
                  <StatBubble statLabel="Low Score" stat={lowScore} />
                  <StatBubble statLabel="Average Score" stat={averageScore} />
                </div>
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-blue-50 rounded-md">
                  <StatBubble
                    statLabel="Number of Brackets"
                    stat={totalBrackets}
                  />
                  <StatBubble
                    statLabel="Last Three Average"
                    stat={
                      lastThreeBracketAverage ? lastThreeBracketAverage : "--"
                    }
                    trend={
                      lastThreeBracketAverage > averageScore ? "up" : "down"
                    }
                  />
                  <StatBubble
                    statLabel="Last Ten Average"
                    stat={lastTenBracketAverage ? lastTenBracketAverage : "--"}
                    trend={lastTenBracketAverage < averageScore ? "up" : "down"}
                  />
                </div>
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-blue-50 rounded-md">
                  <StatBubble statLabel="Total Picks" stat={totalPicks} />
                  <StatBubble
                    statLabel="Correct Picks"
                    stat={totalCorrectPicks}
                  />
                  <StatBubble
                    statLabel="Correct Pick %"
                    stat={correctPickPercentage}
                    percentage
                  />
                </div>
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-blue-50 rounded-md">
                  <StatBubble
                    statLabel="Picked 1st Round Upsets"
                    stat={totalFirstRoundUpsetsPicked}
                  />
                  <StatBubble
                    statLabel="Correct 1st Round Upsets"
                    stat={totalFirstRoundUpsetsCorrect}
                  />
                  <StatBubble
                    statLabel="Correct Upset %"
                    stat={firstRoundUpsetsCorrectPercentage}
                    percentage
                  />
                </div>
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-blue-50 rounded-md">
                  <StatBubble
                    statLabel="Champion Pick %"
                    stat={championCorrectPercentage}
                    percentage
                    className="hidden sm:flex"
                  />
                  <StatBubble
                    statLabel="Final Four Pick %"
                    stat={finalFourCorrectPercentage}
                    percentage
                    className="hidden sm:flex"
                  />
                  <StatBubble
                    statLabel="Elite Eight Pick %"
                    stat={eliteEightCorrectPercentage}
                    percentage
                    className="hidden sm:flex"
                  />
                  <StatBubble
                    statLabel="Sweet Sixteen Pick %"
                    stat={sweetSixteenCorrectPercentage}
                    percentage
                    className="hidden sm:flex"
                  />
                  <StatBubble
                    statLabel="Round Two Pick %"
                    stat={roundTwoCorrectPercentage}
                    percentage
                    className="hidden sm:flex"
                  />
                  <StatBubble
                    statLabel="Round One Pick %"
                    stat={roundOneCorrectPercentage}
                    percentage
                    className="hidden sm:flex"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <StatList
                title="Top Picked Teams"
                statLabel="Picks"
                stats={topPickedTeams?.map((team) => ({
                  team: team.team_name,
                  teamLogoRoute: team.team_logo,
                  stat: team.pick_count,
                }))}
              />
              <StatList
                title="Top Picked Champion"
                statLabel="Picks"
                stats={[
                  {
                    team: topPickedChampion?.name,
                    teamLogoRoute: topPickedChampion?.team_logo,
                    stat: totalTopPickedChampionPicks ?? 0,
                  },
                ]}
              />
              <StatList
                title="Top Picked Conference"
                statLabel="Picks"
                stats={[
                  {
                    team: topPickedConference?.conference,
                    teamLogoRoute: topPickedConference?.conference_logo,
                    stat: totalTopPickedConferencePicks ?? 0,
                  },
                ]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
