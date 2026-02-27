"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useAuth, useProfile, useYears } from "@/src/hooks";
import {
  LineSpacer,
  LoadingBasketball,
  MadnessPrepDashboard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  SelectField,
  UserStatsDashboard,
} from "@/src/components";
import { SECONDARY_COLOR } from "@/src/constants";

export const Dashboard = () => {
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const { user, isLoading: isLoadingAuth } = useAuth();

  const { data: profileData, isLoading: isLoadingProfile } = useProfile(
    user?.id,
  );
  const { data: years, isLoading: isLoadingYears } = useYears();

  useEffect(() => {
    if (years?.length && !selectedYearId) {
      const latestYearId = years[years.length - 1].id;
      setSelectedYearId(latestYearId);
    }
  }, [years, selectedYearId]);

  const handleSelectYear = (year: string) => {
    setSelectedYearId(year);
  };

  const isLoading = isLoadingAuth || isLoadingProfile || isLoadingYears;

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
          <Tabs
            className="w-full flex flex-col items-center justify-center"
            defaultValue="user-stats"
          >
            <TabsList>
              <TabsTrigger value="user-stats">Your Stats</TabsTrigger>
              <TabsTrigger value="madness-predictions">
                Madness Prep
              </TabsTrigger>
            </TabsList>
            <TabsContent value="user-stats">
              <UserStatsDashboard userId={user?.id} yearId={selectedYearId} />
            </TabsContent>
            <TabsContent value="madness-predictions">
              <MadnessPrepDashboard yearId={selectedYearId} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};
