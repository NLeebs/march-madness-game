// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {TeamDto, getAllTeams} from './getAllTeams.ts';
import {GameDto, getAllGames} from './getAllGames.ts';
import {PickDto, getAllPicks} from './getAllPicks.ts';

Deno.serve(async (req: Request) => {
  type TeamsMap = Map<string, TeamDto>
  type ConferenceStatsMap = Map<string, {picks: number; wins: number; losses: number}>

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const teams: TeamDto[] = await getAllTeams(supabase);
    const teamsMap: TeamsMap = new Map(teams.map(team => [team.id, team]));
    const conferenceStatsMap: ConferenceStatsMap = new Map();
    const games: GameDto[] = await getAllGames(supabase);

    for (const game of games ?? []) {
      const favoredTeam = teamsMap.get(game.favored_team_id);
      const favoredConferenceMapKey = `${game.year_id}--${favoredTeam.conference_id}`;
      const favoredConferenceStats = conferenceStatsMap.get(favoredConferenceMapKey) ?? {picks: 0, wins: 0, losses: 0};

      const underdogTeam = teamsMap.get(game.underdog_team_id);
      const underdogConferenceMapKey = `${game.year_id}--${underdogTeam.conference_id}`;
      const underdogConferenceStats = conferenceStatsMap.get(underdogConferenceMapKey) ?? {picks: 0, wins: 0, losses: 0};

      if (game.winning_team_id === favoredTeam.id) {
        favoredConferenceStats.wins += 1;
        underdogConferenceStats.losses += 1;
      } else {
        favoredConferenceStats.losses += 1;
        underdogConferenceStats.wins += 1;
      }

      conferenceStatsMap.set(favoredConferenceMapKey, favoredConferenceStats);
      conferenceStatsMap.set(underdogConferenceMapKey, underdogConferenceStats);
    }

    const picks: PickDto[] = await getAllPicks(supabase);

    for (const pick of picks ?? []) {
      const pickedTeam = teamsMap.get(pick.picked_team_id);
      const pickedConferenceMapKey = `${pickedTeam.year_id}--${pickedTeam.conference_id}`;
      const pickedConferenceStats = conferenceStatsMap.get(pickedConferenceMapKey) ?? {picks: 0, wins: 0, losses: 0};

      pickedConferenceStats.picks += 1;

      conferenceStatsMap.set(pickedConferenceMapKey, pickedConferenceStats);
    }

    for (const [conferenceKey, conferenceStats] of conferenceStatsMap) {
      const [year_id, conference_id] = conferenceKey.split("--");

      const {error: supabaseError} = await supabase
        .from("global_conference_stats")
        .upsert({
          year_id,
          conference_id,
          picks: conferenceStats.picks,
          wins: conferenceStats.wins,
          losses: conferenceStats.losses
        },
        {onConflict: ["year_id", "conference_id"]}
      );

       if (supabaseError) {
        console.error("Supabase error: ", supabaseError);
        throw new Error(`Supabase upsert failed: ${supabaseError.message} (${supabaseError.code})`);
      } 
    }

    return new Response(JSON.stringify({ message: "Global Conference Stats updated successfully."}), {
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