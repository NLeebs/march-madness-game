// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { BracketDto, getAllBrackets } from './getAllBrackets.ts';
import {RoundName, RoundDto, getSpecificRounds} from './getSpecificRounds.ts';
import { PickDto, getPicksForSpecificBracket } from './getPicksForSpecificBracket.ts';
import { GameDto, getGamesForSpecificGameIds } from './getGamesForSpecificGameIds.ts';

Deno.serve(async (req) => {
  type RoundMap = Map<RoundName, RoundDto>;
  type GameMap = Map<string, GameDto>;
  type EnrichedPick = PickDto & {game: GameDto | null}

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const rounds: RoundDto[] = await getSpecificRounds(supabase, ["1", "finals"])
    const roundMap: RoundMap = new Map(rounds.map(round => [round.round_name, round])); 
    if (!roundMap.get("1") || !roundMap.get("finals")) {
      console.error("Required rounds are missing");
      throw new Error(`Required rounds are missing. Found: ${Array.from(roundMap.keys()).join(", ")}`);
    }

    const brackets: BracketDto[] = await getAllBrackets(supabase);

    for (const bracket of brackets ?? []) {
      if (!bracket.user_id) continue;

      const picks: PickDto[] = await getPicksForSpecificBracket(supabase, bracket.id);
      
      const gameIds: string[] = picks.map(p => p.game_id);
      const games: GameDto[] = await getGamesForSpecificGameIds(supabase, gameIds);

      const gamesMap: GameMap = new Map(games.map(game => [game.id, game]));
      const enrichedPicks: EnrichedPick[] = picks.map(pick => ({
        ...pick,
        game: gamesMap.get(pick.game_id ?? null)
      }));

      let gamesPlayed = 0;
      let correct = 0;
      let incorrect = 0;
      let firstRoundUpsetsPicked = 0;
      let firstRoundUpsetsCorrect = 0;

      let championPickedTeamId: string | null = null;
      let championCorrect = false;

      for (const pick of enrichedPicks ?? []) {
        const game = pick.game;
        if (!game?.winning_team_id) continue;

        gamesPlayed++;

        if (pick.picked_team_id === game.winning_team_id) {
          correct++;
        } else if (pick.picked_team_id) {
          incorrect++;
        }

        if (game.round_id === roundMap.get("1").id) {
          if (pick.picked_team_seed === game.underdog_team_seed) {
            firstRoundUpsetsPicked++;
            if (game.winning_team_id === pick.picked_team_id) {
              firstRoundUpsetsCorrect++;
            }
          }
        }

        if (game.round_id === roundMap.get("finals").id) {
          championPickedTeamId = pick.picked_team_id;
          championCorrect = pick.picked_team_id === game.winning_team_id;
        }
      }

      const {error: supabaseError} = await supabase
      .from("user_bracket_stats")
      .upsert(
        {
          bracket_id: bracket.id,
          user_id: bracket.user_id,
          year_id: bracket.year_id,
          games_played: gamesPlayed,
          correct_picks: correct,
          incorrect_picks: incorrect,
          first_round_upsets_picked: firstRoundUpsetsPicked,
          first_round_upsets_correct: firstRoundUpsetsCorrect,
          champion_picked_team_id: championPickedTeamId,
          champion_correct: championCorrect,
        },
        { onConflict: "bracket_id" }
      );

      if (supabaseError) {
        console.error("Supabase error: ", supabaseError)
        throw new Error(`Supabase upsert failed: ${supabaseError.message} (${supabaseError.code})`);
      }
    }

    return new Response(JSON.stringify({ message: "Bracket Stats updated successfully."}), {
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