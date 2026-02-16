"use client";
import React, { useState, useEffect } from "react";
import {
  useAuth,
  useUserBracketsByYearId,
  useProfile,
  useYears,
} from "@/src/hooks";
import {
  LineSpacer,
  LoadingBasketball,
  SelectField,
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
  console.log(userBrackets);

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
    isLoadingProfile || isLoadingYears || isLoadingUserBracketsByYearId;

  return (
    <div className="w-full h-full py-4 px-8 overflow-y-scroll">
      {isLoading ? (
        <LoadingBasketball size={150} />
      ) : (
        <div className="flex flex-col justify-start items-start">
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
          {userBrackets ? (
            <UserBracketChart data={userBrackets} lineColor={PRIMARY_COLOR} />
          ) : (
            <div className="w-full h-full flex justify-center items-center">
              <p>Play some games!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
