// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {GameDto, getAllGames} from './getAllGames.ts';
import {calculatePercentage} from './utils.ts';

Deno.serve(async (req) => {
  type SeedMatchupMap = Map<string, {higherSeedWins: number; lowerSeedWins: number, totalGames: number;}>;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const seedMatchupMap: SeedMatchupMap = new Map();
    const games: GameDto[] = await getAllGames(supabase);

    for (const game of games ?? []) {
      if (game.is_play_in) continue;

      const favoredTeamId = game.favored_team_id;
      const favoredTeamSeed = game.favored_team_seed;

      const underdogTeamId = game.underdog_team_id;
      const underdogTeamSeed = game.underdog_team_seed;

      const seedMatchupMapKey = `${game.year_id}--${game.round_id}--${favoredTeamSeed}--${underdogTeamSeed}`;
      const seedMatchupStats = seedMatchupMap.get(seedMatchupMapKey) ?? {higherSeedWins: 0, lowerSeedWins: 0, totalGames: 0};

      if (game.winning_team_id === favoredTeamId) {
        seedMatchupStats.higherSeedWins += 1;
      } else if (game.winning_team_id === underdogTeamId) {
        seedMatchupStats.lowerSeedWins += 1;
      }

      seedMatchupStats.totalGames += 1;

      seedMatchupMap.set(seedMatchupMapKey, seedMatchupStats);
    }
      
    for (const [seedMatchupKey, seedMatchupStats] of seedMatchupMap) {
      const [year_id, round_id, higher_seed, lower_seed] = seedMatchupKey.split('--');

      const {error: supabaseError} = await supabase
        .from("seed_matchup_stats")
        .upsert({
          year_id,
          round_id,
          higher_seed,
          higher_seed_wins: seedMatchupStats.higherSeedWins,
          lower_seed,
          lower_seed_wins: seedMatchupStats.lowerSeedWins,
          total_games: seedMatchupStats.totalGames,
          upset_percentage: calculatePercentage(seedMatchupStats.lowerSeedWins, seedMatchupStats.totalGames)
        },
        {onConflict: ["year_id", "round_id", "higher_seed", "lower_seed"]}
      );

       if (supabaseError) {
        console.error("Supabase error: ", supabaseError,);
        throw new Error(`Supabase upsert failed: ${supabaseError.message} (${supabaseError.code})`);
      } 
    }

    return new Response(JSON.stringify({ message: "Seed Matchup Stats updated successfully." }), {
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