// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { TeamDto, getAllTeams } from './getAllTeams.ts';
import { BracketDto, getAllBrackets } from './getAllBrackets.ts';
import {RoundName, RoundDto, getAllRounds} from './getAllRounds.ts';
import { PickDto, getPicksForSpecificBracket } from './getPicksForSpecificBracket.ts';
import { GameDto, getGamesForSpecificGameIds } from './getGamesForSpecificGameIds.ts';
import {averageScore, calculatePercentage, mostFrequentId, frequencyOfIds, groupUsersByYear, rankUsersByAttribute} from './utils.ts';

Deno.serve(async (req) => {
  type UserStats = {
    totalBrackets: number; 
    totalPicks: number; 
    totalCorrectPicks: number;
    scores: number[]; 
    highScore: number; 
    highScoreRank: number | null;  
    lowScore: number; 
    averageScore: number; 
    averageScoreRank: number | null;
    lastThreeAverageScore: number;
    lastTenAverageScore: number;
    totalFirstRoundUpsetsPicked: number;
    totalFirstRoundUpsetsCorrect: number; 
    championsGuessed: string[]; 
    totalChampionsPicked: number;
    championsGuessedCorrectly: number; 
    championsGuessedCorrectlyRank: number | null;
    topPickedChampionId: string | null;
    totalTopPickedChampionPicks: number;
    totalFinalFoursPicked: number;
    finalFoursGuessedCorrectly: number;
    totalEliteEightsPicked: number;
    eliteEightsGuessedCorrectly: number;
    totalSweetSixteensPicked: number;
    sweetSixteensGuessedCorrectly: number;
    totalRoundTwosPicked: number;
    roundTwosGuessedCorrectly: number;
    totalRoundOnesPicked: number;
    roundOnesGuessedCorrectly: number;
    conferencesPicked: string[];
    topPickedConferenceId: string | null;
    totalTopPickedConferencePicks: number;
  }
  type UserStatsMap = Map<string, UserStats>
  type TeamMap = Map<string, TeamDto>;
  type RoundMap = Map<RoundName, string>;
  type GameMap = Map<string, GameDto>;
  type EnrichedPick = PickDto & {game: GameDto | null}
  type YearMap<T> = Map<string, T[]>;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const userStatsMap: UserStatsMap = new Map();

    const teams: TeamDto[] = await getAllTeams(supabase);
    const teamMap: TeamMap = new Map(teams.map(team => [team.id, team]));

    const rounds: RoundDto[] = await getAllRounds(supabase);
    const roundMap: RoundMap = new Map(rounds.map(round => [round.round_name, round.id]));
    
    const brackets: BracketDto[] = await getAllBrackets(supabase);

    for (const bracket of brackets) {
      const bracketUserId = bracket.user_id;
      if (!bracketUserId) continue;

      const bracketId = bracket.id;
      const bracketYearId = bracket.year_id;
      const bracketScore = bracket.score;
      const userStatsMapKey = `${bracketUserId}--${bracketYearId}`;
      const userStats = userStatsMap.get(userStatsMapKey) ?? {
        totalBrackets: 0, 
        totalPicks: 0,
        totalCorrectPicks: 0, 
        scores: [], 
        highScore: 0, 
        highScoreRank: null, 
        lowScore: 0, 
        averageScore: 0, 
        averageScoreRank: null,
        lastThreeAverageScore: 0,
        lastTenAverageScore: 0,
        totalFirstRoundUpsetsPicked: 0,
        totalFirstRoundUpsetsCorrect: 0,
        championsGuessed: [], 
        totalChampionsPicked: 0,
        championsGuessedCorrectly: 0, 
        championsGuessedCorrectlyRank: null,
        topPickedChampionId: null,
        totalTopPickedChampionPicks: 0,
        totalFinalFoursPicked: 0,
        finalFoursGuessedCorrectly: 0,
        totalEliteEightsPicked: 0,
        eliteEightsGuessedCorrectly: 0,
        totalSweetSixteensPicked: 0,
        sweetSixteensGuessedCorrectly: 0,
        totalRoundTwosPicked: 0,
        roundTwosGuessedCorrectly: 0,
        totalRoundOnesPicked: 0,
        roundOnesGuessedCorrectly: 0,
        conferencesPicked: [],
        topPickedConferenceId: null,
        totalTopPickedConferencePicks: 0
      };

      userStats.totalBrackets += 1;
      userStats.scores.push(bracketScore);

      const bracketPicks: PickDto[] = await getPicksForSpecificBracket(supabase, bracketId);
      const bracketGameIds: string[] = bracketPicks.map(pick => pick.game_id);
      const bracketGames: GameDto[] = await getGamesForSpecificGameIds(supabase, bracketGameIds);
      const bracketGamesMap: GameMap = new Map(bracketGames.map(game => [game.id, game]));
      const bracketEnrichedPicks: EnrichedPick[] = bracketPicks.map(pick => ({
        ...pick,
        game: bracketGamesMap.get(pick.game_id ?? null)
      }));

      for (const pick of bracketEnrichedPicks) {
        userStats.totalPicks += 1;

        const pickedTeamId = pick.picked_team_id;
        const winningTeamId = pick.game.winning_team_id;
        if (pickedTeamId === winningTeamId) {
          userStats.totalCorrectPicks += 1;
        }

        const pickedConferenceId = teamMap.get(pickedTeamId).conference_id;
        userStats.conferencesPicked.push(pickedConferenceId);

        const gameRoundId = pick.game.round_id;
        if (gameRoundId === roundMap.get("finals")) {
          userStats.totalChampionsPicked += 1;
          userStats.championsGuessed.push(pickedTeamId);

          const championId = pick.game.winning_team_id;
          if (pickedTeamId === championId) {
            userStats.championsGuessedCorrectly += 1;
          }
        } else if (gameRoundId === roundMap.get("final four")) {
          userStats.totalFinalFoursPicked += 1;
          if (pick.game.winning_team_id === pick.picked_team_id) {
            userStats.finalFoursGuessedCorrectly += 1;
          }
        } else if (gameRoundId === roundMap.get("elite eight")) {
          userStats.totalEliteEightsPicked += 1;
          if (pick.game.winning_team_id === pick.picked_team_id) {
            userStats.eliteEightsGuessedCorrectly += 1;
          }
        } else if (gameRoundId === roundMap.get("sweet sixteen")) {
          userStats.totalSweetSixteensPicked += 1;
          if (pick.game.winning_team_id === pick.picked_team_id) {
            userStats.sweetSixteensGuessedCorrectly += 1;
          }
        } else if (gameRoundId === roundMap.get("2")) {
          userStats.totalRoundTwosPicked += 1;
          if (pick.game.winning_team_id === pick.picked_team_id) {
            userStats.roundTwosGuessedCorrectly += 1;
          }
        } else if (gameRoundId === roundMap.get("1")) {
          userStats.totalRoundOnesPicked += 1;
          if (pick.game.winning_team_id === pick.picked_team_id) {
            userStats.roundOnesGuessedCorrectly += 1;
          }

          if (pick.picked_team_seed === pick.game.underdog_team_seed) {
            userStats.totalFirstRoundUpsetsPicked += 1;
            if (pick.game.winning_team_id === pick.picked_team_id) {
              userStats.totalFirstRoundUpsetsCorrect += 1;
            }
          }
        }
      }

      userStatsMap.set(userStatsMapKey, userStats);
    }

    for (const [userStatsKey, userStats] of userStatsMap) {
      const userScores = userStats.scores;
      console.log(userScores);
      userStats.highScore = Math.max(...userScores);
      userStats.lowScore = Math.min(...userScores);
      if (userScores.length >= 5) {
        userStats.averageScore = averageScore(userScores);
        userStats.lastThreeAverageScore = averageScore(userScores.slice(-3));
      } else if (userScores.length >= 11) {
        userStats.lastTenAverageScore = averageScore(userScores.slice(-10));
      }

      const userChampionPicks = userStats.championsGuessed;
      userStats.topPickedChampionId = mostFrequentId(userChampionPicks);
      userStats.totalTopPickedChampionPicks = frequencyOfIds(userChampionPicks);

      const userConferencePicks = userStats.conferencesPicked;
      userStats.topPickedConferenceId = mostFrequentId(userConferencePicks);
      userStats.totalTopPickedConferencePicks = frequencyOfIds(userConferencePicks);

      userStatsMap.set(userStatsKey, userStats);
    }

    const yearMap: YearMap<UserStats[]> = groupUsersByYear(userStatsMap);
    for (const usersOfYear of yearMap.values()) {
      rankUsersByAttribute(usersOfYear, "highScore", "highScoreRank");
      rankUsersByAttribute(usersOfYear, "averageScore", "averageScoreRank");
      rankUsersByAttribute(usersOfYear, "championsGuessedCorrectly", "championsGuessedCorrectlyRank");
    }

    for (const [userStatsKey, userStats] of userStatsMap) {
      const [user_id, year_id] = userStatsKey.split('--');

      const {error: supabaseError} = await supabase
      .from("user_total_stats")
      .upsert(
        {
          user_id,
          year_id,
          total_brackets: userStats.totalBrackets,
          total_picks: userStats.totalPicks,
          total_correct_picks: userStats.totalCorrectPicks,
          correct_pick_percentage: calculatePercentage(userStats.totalCorrectPicks, userStats.totalPicks),
          high_score: userStats.highScore,
          high_score_rank: userStats.highScoreRank,
          low_score: userStats.lowScore,
          average_score: userStats.averageScore,
          average_score_rank: userStats.averageScoreRank,
          last_three_average_score: userStats.lastThreeAverageScore,
          last_ten_average_score: userStats.lastTenAverageScore,
          total_first_round_upsets_picked: userStats.totalFirstRoundUpsetsPicked,
          total_first_round_upsets_correct: userStats.totalFirstRoundUpsetsCorrect,
          first_round_upsets_correct_percentage: calculatePercentage(
            userStats.totalFirstRoundUpsetsCorrect, 
            userStats.totalFirstRoundUpsetsPicked
          ),
          champions_guessed_correctly: userStats.championsGuessedCorrectly,
          champions_guessed_correctly_rank: userStats.championsGuessedCorrectlyRank,
          champion_correct_percentage: calculatePercentage(userStats.championsGuessedCorrectly, userStats.totalChampionsPicked),
          top_picked_champion_id: userStats.topPickedChampionId,
          total_top_picked_champion_picks: userStats.totalTopPickedChampionPicks,
          total_final_fours_picked: userStats.totalFinalFoursPicked,
          final_fours_guessed_correctly: userStats.finalFoursGuessedCorrectly,
          final_four_correct_percentage: calculatePercentage(userStats.finalFoursGuessedCorrectly, userStats.totalFinalFoursPicked),
          total_elite_eights_picked: userStats.totalEliteEightsPicked,
          elite_eights_guessed_correctly: userStats.eliteEightsGuessedCorrectly,
          elite_eight_correct_percentage: calculatePercentage(userStats.eliteEightsGuessedCorrectly, userStats.totalEliteEightsPicked),
          total_sweet_sixteens_picked: userStats.totalSweetSixteensPicked,
          sweet_sixteens_guessed_correctly: userStats.sweetSixteensGuessedCorrectly,
          sweet_sixteen_correct_percentage: calculatePercentage(
            userStats.sweetSixteensGuessedCorrectly, 
            userStats.totalSweetSixteensPicked
          ),
          total_round_twos_picked: userStats.totalRoundTwosPicked,
          round_twos_guessed_correctly: userStats.roundTwosGuessedCorrectly,
          round_two_correct_percentage: calculatePercentage(userStats.roundTwosGuessedCorrectly, userStats.totalRoundTwosPicked),
          total_round_ones_picked: userStats.totalRoundOnesPicked,
          rounds_ones_guessed_correctly: userStats.roundOnesGuessedCorrectly,
          round_one_correct_percentage: calculatePercentage(userStats.roundOnesGuessedCorrectly, userStats.totalRoundOnesPicked),
          top_picked_conference_id: userStats.topPickedConferenceId,
          total_top_picked_conference_picks: userStats.totalTopPickedConferencePicks
        },
        { onConflict: ["user_id", "year_id"] }
      );

      if (supabaseError) {
        console.error("Supabase error: ", supabaseError)
        throw new Error(`Supabase upsert failed: ${supabaseError.message} (${supabaseError.code})`);
      }
    }

    return new Response(JSON.stringify({ message: "User Total Stats updated successfully."}), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error("Edge Function Error:", err)
    return new Response(
      JSON.stringify({
        error: err instanceof Error
          ? {
              message: err.message,
              stack: err.stack,
            }
          : err,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
});