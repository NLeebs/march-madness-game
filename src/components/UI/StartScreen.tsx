"use client";
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { StartButton, SelectField } from "@/src/components/UI";
import {
  regularSeasonRecordActions,
  RootState,
  teamScheduleActions,
  teamStatsActions,
  appStateActions,
} from "@/store";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/hooks";
import { ConferenceMap } from "@/models";

export const StartScreen = () => {
  const appState = useSelector((state: RootState) => state.appState);
  const teamScheduleObj = useSelector((state: RootState) => state.teamSchedule);
  const isAppLoading = useSelector(
    (state: RootState) => state.appState.loading
  );
  const dispatch = useDispatch();
  const { authLoading } = useAuth();

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedYearTeamStats, setSelectedYearTeamStats] =
    useState<ConferenceMap | null>(null);

  const { data: years, isLoading: isLoadingYears } = useQuery({
    queryKey: ["years"],
    queryFn: () => fetch("/api/years").then((res) => res.json()),
  });
  useEffect(() => {
    if (years?.length && !selectedYearId) {
      setSelectedYearId(years[years.length - 1].id);
    }
  }, [years, selectedYearId]);

  const {
    data: tournamentScoringRuleId,
    isLoading: isLoadingTournamentScoringRuleId,
  } = useQuery({
    queryKey: ["tournamentScoringRuleId", selectedYearId],
    queryFn: () =>
      fetch(`/api/tournament-scoring-rules/${selectedYearId}`).then((res) =>
        res.json()
      ),
  });

  const { data: teamStats, isLoading: isLoadingTeamStats } = useQuery({
    queryKey: ["teamStats", selectedYearId],
    queryFn: () =>
      fetch(`/api/team-statistics/${selectedYearId}`).then((res) => res.json()),
  });
  useEffect(() => {
    if (teamStats) {
      setSelectedYearTeamStats(teamStats);
    }
  }, [teamStats]);

  useEffect(() => {
    if (selectedYearTeamStats) {
      dispatch(teamStatsActions.addToStateFromDB(selectedYearTeamStats));
      dispatch(teamStatsActions.addConferenceArrays(selectedYearTeamStats));
      dispatch(teamScheduleActions.teamScheduleConfig(selectedYearTeamStats));
      dispatch(
        regularSeasonRecordActions.regularSeasonRecordConfig(
          selectedYearTeamStats
        )
      );
    }
  }, [selectedYearTeamStats, dispatch]);

  const handleSelectYear = (year: string) => {
    setSelectedYearId(year);
  };

  useEffect(() => {
    if (teamScheduleObj.teamArray.length > 0)
      dispatch(appStateActions.loadingComplete());
  }, [dispatch, teamScheduleObj.teamArray.length]);

  return (
    <div className="w-screen h-[calc(100vh-5rem)] pb-4 overflow-y-auto flex flex-col justify-center items-center">
      <div
        className={`flex flex-col items-center transition-opacity duration-500 ${
          appState.transition && "opacity-0"
        }`}
      >
        <h1>Madness</h1>
        <h2 className="pb-4">The Game</h2>
        <SelectField
          label="Select the tournament year"
          popupLabel="Year"
          placeholder="Select Year"
          value={selectedYearId}
          options={
            years?.map((year) => ({ label: year.year, value: year.id })) || []
          }
          onValueChange={handleSelectYear}
          containerClassName="pr-4 pl-4 mb-8"
          selectClassName="w-36 bg-white"
        />
      </div>
      <StartButton
        yearId={selectedYearId}
        tournamentScoringRuleId={tournamentScoringRuleId}
        isLoading={
          isLoadingYears ||
          isLoadingTournamentScoringRuleId ||
          isLoadingTeamStats ||
          authLoading ||
          isAppLoading
        }
      />
    </div>
  );
};
