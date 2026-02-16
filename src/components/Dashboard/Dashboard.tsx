"use client";
import { useAuth } from "@/src/hooks";
import { useQuery } from "@tanstack/react-query";
import { AppError } from "@/utils/errorHandling";

export const Dashboard = () => {
  const { user } = useAuth();

  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/profile/${user?.id}`);
      if (!response.ok) {
        throw new AppError("Failed to fetch user profile", response.status);
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  return (
    <div>
      <h1>Dashboard</h1>
      {isLoadingProfile ? (
        <div>Loading profile...</div>
      ) : (
        <div>
          <h2>{profileData?.username}</h2>
        </div>
      )}
    </div>
  );
};
