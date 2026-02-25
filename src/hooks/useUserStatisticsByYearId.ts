import { useQuery } from "@tanstack/react-query";
import { UserTotalStatsSupabase } from "@/models/appStatsData";
import { AppError } from "@/utils/errorHandling";

export function useUserStatisticsByYearId(userId: string, yearId: string) {
  const { data, isLoading: isLoadingUserStatisticsByYearId } =
    useQuery<UserTotalStatsSupabase>({
    queryKey: ["userStatisticsByYearId", userId, yearId],
    queryFn: async () => {
      const response = await fetch(`/api/user-statistics/${userId}/${yearId}`);
      if (!response.ok) {
        throw new AppError(
          "Failed to fetch user statistics by year id",
          response.status,
        );
      }
      return (await response.json()) as UserTotalStatsSupabase;
    },
    enabled: !!userId && !!yearId,
  });

  const highScore = data?.high_score;
  const lowScore = data?.low_score;
  const averageScore = data?.average_score;
  const totalBrackets = data?.total_brackets;
  const totalPicks = data?.total_picks;
  const totalCorrectPicks = data?.total_correct_picks;
  const correctPickPercentage = data?.correct_pick_percentage;
  const lastThreeBracketAverage = data?.last_three_average_score;
  const lastTenBracketAverage = data?.last_ten_average_score;
  const totalFirstRoundUpsetsPicked = data?.total_first_round_upsets_picked;
  const totalFirstRoundUpsetsCorrect = data?.total_first_round_upsets_correct;
  const firstRoundUpsetsCorrectPercentage =
    data?.first_round_upsets_correct_percentage;
  const championCorrectPercentage = data?.champion_correct_percentage;
  const finalFourCorrectPercentage = data?.final_four_correct_percentage;
  const eliteEightCorrectPercentage = data?.elite_eight_correct_percentage;
  const sweetSixteenCorrectPercentage = data?.sweet_sixteen_correct_percentage;
  const roundTwoCorrectPercentage = data?.round_two_correct_percentage;
  const roundOneCorrectPercentage = data?.round_one_correct_percentage;
  const topPickedChampionId = data?.top_picked_champion_id;
  const totalTopPickedChampionPicks = data?.total_top_picked_champion_picks;
  const topPickedConferenceId = data?.top_picked_conference_id;
  const totalTopPickedConferencePicks = data?.total_top_picked_conference_picks;

  return {
    isLoadingUserStatisticsByYearId,
    highScore,
    lowScore,
    averageScore,
    totalBrackets,
    totalPicks,
    totalCorrectPicks,
    correctPickPercentage,
    lastThreeBracketAverage,
    lastTenBracketAverage,
    totalFirstRoundUpsetsPicked,
    totalFirstRoundUpsetsCorrect,
    firstRoundUpsetsCorrectPercentage,
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
  };
}
