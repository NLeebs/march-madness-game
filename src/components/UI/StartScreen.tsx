"use client";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { StartButton, SelectField } from "@/src/components/UI";
import { RootState } from "@/store";
import { useQuery } from "@tanstack/react-query";

export const StartScreen = () => {
  const appState = useSelector((state: RootState) => state.appState);

  const [selectedYear, setSelectedYear] = useState<string>("");

  const { data: years, isLoading } = useQuery({
    queryKey: ["years"],
    queryFn: () => fetch("/api/years").then((res) => res.json()),
  });

  useEffect(() => {
    if (years?.length && !selectedYear) {
      setSelectedYear(years[years.length - 1].id);
    }
  }, [years, selectedYear]);

  const {
    data: tournamentScoringRuleId,
    isLoading: isLoadingTournamentScoringRuleId,
  } = useQuery({
    queryKey: ["tournamentScoringRuleId", selectedYear],
    queryFn: () =>
      fetch(`/api/tournament_scoring_rules/${selectedYear}`).then((res) =>
        res.json()
      ),
  });

  const handleSelectYear = (year: string) => {
    setSelectedYear(year);
  };

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
          value={selectedYear}
          options={
            years?.map((year) => ({ label: year.year, value: year.id })) || []
          }
          onValueChange={handleSelectYear}
          containerClassName="pr-4 pl-4 mb-8"
          selectClassName="w-36 bg-white"
        />
      </div>
      <StartButton
        yearId={selectedYear}
        tournamentScoringRuleId={tournamentScoringRuleId}
      />
    </div>
  );
};
