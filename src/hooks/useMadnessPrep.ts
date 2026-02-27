import { useQuery } from "@tanstack/react-query";
import { AppError } from "@/utils/errorHandling";
import { TeamPerformanceSupabase } from "@/models/appStatsData";

export function useMadnessPrep(yearId: string) {
  const { data: topPerformingTeams, isLoading: isLoadingMadnessPrep } =
    useQuery({
      queryKey: ["topPerformingTeams", yearId],
      queryFn: async () => {
        const response = await fetch(`/api/teams/top-performers/${yearId}`);
        if (!response.ok) {
          throw new AppError(
            "Failed to fetch top performing teams",
            response.status,
          );
        }
        return response.json() as Promise<TeamPerformanceSupabase[]>;
      },
      enabled: !!yearId,
    });

  const {
    data: topPerformingNonPowerConferenceTeams,
    isLoading: isLoadingTopPerformingNonPowerConferenceTeams,
  } = useQuery({
    queryKey: ["topPerformingNonPowerConferenceTeams", yearId],
    queryFn: async () => {
      const response = await fetch(
        `/api/teams/top-performers/non-power-conference/${yearId}`,
      );
      if (!response.ok) {
        throw new AppError(
          "Failed to fetch top performing non power conference teams",
          response.status,
        );
      }
      return response.json() as Promise<TeamPerformanceSupabase[]>;
    },
    enabled: !!yearId,
  });

  const { data: topPickedTeams, isLoading: isLoadingTopPickedTeams } = useQuery(
    {
      queryKey: ["topPickedTeams", yearId],
      queryFn: async () => {
        const response = await fetch(`/api/teams/most-picked/${yearId}`);
        if (!response.ok) {
          throw new AppError(
            "Failed to fetch top picked teams",
            response.status,
          );
        }
        return response.json() as Promise<TeamPerformanceSupabase[]>;
      },
      enabled: !!yearId,
    },
  );

  const {
    data: teamsThatCausedMostUpsets,
    isLoading: isLoadingTeamsThatCausedMostUpsets,
  } = useQuery({
    queryKey: ["teamsThatCausedMostUpsets", yearId],
    queryFn: async () => {
      const response = await fetch(`/api/teams/upsets/caused/${yearId}`);
      if (!response.ok) {
        throw new AppError(
          "Failed to fetch teams that caused most upsets",
          response.status,
        );
      }
      return response.json() as Promise<TeamPerformanceSupabase[]>;
    },
    enabled: !!yearId,
  });

  return {
    topPerformingTeams,
    topPerformingNonPowerConferenceTeams,
    topPickedTeams,
    teamsThatCausedMostUpsets,
    isLoadingMadnessPrep,
    isLoadingTopPerformingNonPowerConferenceTeams,
    isLoadingTopPickedTeams,
    isLoadingTeamsThatCausedMostUpsets,
  };
}
