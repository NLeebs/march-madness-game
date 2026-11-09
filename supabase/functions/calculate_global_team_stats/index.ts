// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {TeamDto, getAllTeams} from './getAllTeams.ts';
import {GameDto, getAllGames} from './getAllGames.ts';
import {RoundDto, getAllRounds} from './getAllRounds.ts';
import {RoundScoringDto, getAllRoundScorings} from './getAllRoundScorings.ts';
import {PickDto, getAllPicks} from './getAllPicks.ts';

Deno.serve(async (req) => {
  type TeamStatsMap = Map<string, {yearId: string; picks: number; tournamentPointsScored: number; championships: number, finals: number; finalFours: number; 
    eliteEights: number; sweetSixteens: number; secondRounds: number; tournamentAppearances: number; upsetsCaused: number; timesUpset: number}>;
  type RoundsMap = Map<string, RoundDto>;
  type RoundScoringMap = Map<string, RoundScoringDto>;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const teams: TeamDto[] = await getAllTeams(supabase);
    const teamStatsMap: TeamStatsMap = new Map(teams.map(team => [team.id, {
        yearId: team.year_id, 
        picks: 0, 
        tournamentPointsScored: 0, 
        championships: 0, 
        finals: 0, 
        finalFours: 0, 
        eliteEights: 0, 
        sweetSixteens: 0, 
        secondRounds: 0, 
        tournamentAppearances: 0, 
        upsetsCaused: 0, 
        timesUpset: 0
        }
      ]
    ));

    const rounds: RoundDto[] = await getAllRounds(supabase);
    const roundsMap: RoundsMap = new Map(rounds.map(round => [round.round_name, round]));

    const roundScorings: RoundScoringDto[] = await getAllRoundScorings(supabase);
    const roundScoringMap: RoundScoringMap = new Map(roundScorings.map(roundScoreing => [roundScoreing.round_id, roundScoreing.score]));

    const picks: PickDto[] = await getAllPicks(supabase);

    for (const pick of picks ?? []) {
      const pickedTeamId = pick.picked_team_id;
      const pickedTeamStats = teamStatsMap.get(pickedTeamId);
      pickedTeamStats.picks += 1;
    }

    const games: GameDto[] = await getAllGames(supabase);

    for (const game of games ?? []) {
      const favoredTeamId = game.favored_team_id;
      const favoredTeamSeed = game.favored_team_seed;
      const favoredTeamStats = teamStatsMap.get(game.favored_team_id);

      const underdogTeamId = game.underdog_team_id;
      const underdogTeamSeed = game.underdog_team_seed;
      const underdogTeamStats = teamStatsMap.get(game.underdog_team_id);

      const gameRoundId = game.round_id;
      const isPlayIn = game.is_play_in;

      const tournamentPointsScoredThisRound = roundScoringMap.get(gameRoundId);

      if (game.winning_team_id === favoredTeamId && !isPlayIn) {
        favoredTeamStats.tournamentPointsScored += tournamentPointsScoredThisRound;
      } else if (game.winning_team_id === underdogTeamId && !isPlayIn) {
        underdogTeamStats.tournamentPointsScored += tournamentPointsScoredThisRound;

        if (favoredTeamSeed !== underdogTeamSeed) {
          favoredTeamStats.timesUpset += 1;
          underdogTeamStats.upsetsCaused += 1;
        }
      }

      if (gameRoundId === roundsMap.get("1").id) {
        favoredTeamStats.tournamentAppearances += 1;
        underdogTeamStats.tournamentAppearances += 1;
      }

      if (gameRoundId === roundsMap.get("2").id) {
        favoredTeamStats.secondRounds += 1;
        underdogTeamStats.secondRounds += 1;
      }

      if (gameRoundId === roundsMap.get("sweet sixteen").id) {
        favoredTeamStats.sweetSixteens += 1;
        underdogTeamStats.sweetSixteens += 1;
      }

      if (gameRoundId === roundsMap.get("elite eight").id) {
        favoredTeamStats.eliteEights += 1;
        underdogTeamStats.eliteEights += 1;
      }

      if (gameRoundId === roundsMap.get("final four").id) {
        favoredTeamStats.finalFours += 1;
        underdogTeamStats.finalFours += 1;
      }

      if (gameRoundId === roundsMap.get("finals").id) {
        favoredTeamStats.finals += 1;
        underdogTeamStats.finals += 1;

        if (game.winning_team_id === favoredTeamId) favoredTeamStats.championships += 1;
        else if (game.winning_team_id === underdogTeamId) underdogTeamStats.championships += 1;
      }
    }
      
    for (const [teamId, teamStats] of teamStatsMap) {
      const {data, error: supabaseError} = await supabase
        .from("global_team_stats")
        .upsert({
          year_id: teamStats.yearId,
          team_id: teamId,
          picks: teamStats.picks,
          tournament_points_scored: teamStats.tournamentPointsScored,
          championships: teamStats.championships,
          finals: teamStats.finals,
          final_fours: teamStats.finalFours,
          elite_eights: teamStats.eliteEights,
          sweet_sixteens: teamStats.sweetSixteens,
          second_rounds: teamStats.secondRounds,
          tournament_appearances: teamStats.tournamentAppearances,
          upsets_caused: teamStats.upsetsCaused,
          times_upset: teamStats.timesUpset,
        },
        {onConflict: ["year_id", "team_id"]}
      );

       if (supabaseError) {
        console.error("Supabase error: ", supabaseError)
        throw new Error(`Supabase upsert failed: ${supabaseError.message} (${supabaseError.code})`);
      } 
    }

    console.log("Get to the response!");

    return new Response(JSON.stringify({ message: "Global Team Stats updated successfully." }), {
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