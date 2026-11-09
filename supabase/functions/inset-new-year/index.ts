// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {rulesDescription, rulesVersion} from './description.ts';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const currentYear = new Date().getFullYear();

    const { error: upsertYearError } = await supabase
      .from('years')
      .upsert(
        {year: currentYear}, 
        {ignoreDuplicates: true, onConflict: "year"}
      );

    if (upsertYearError) {
      console.error("Upsert year error: ", upsertYearError);
      throw new Error(`Failed to upsert new year: ${upsertYearError.message}`)
    };

    const {data: years, error: yearsError} = await supabase
      .from("years")
      .select("id, year")
      .in("year", [currentYear]);

    if (yearsError) {
      console.error("Years error: ", yearsError);
      throw new Error(`Years not found: ${upsertYearError.message}`)
    };

    const year = years.pop();

    const { error: upsertTournamentRulesError } = await supabase
      .from('tournament_scoring_rules')
      .upsert(
        {
          year_id: year.id,
          description: rulesDescription,
          version: rulesVersion
        }, 
        {ignoreDuplicates: true, onConflict: "year_id"}
      );

    if (upsertTournamentRulesError) {
      console.error("Upsert tournament rules error: ", upsertTournamentRulesError);
      throw new Error(`Failed to upsert new rules: ${upsertTournamentRulesError.message}`)
    };

    return new Response(JSON.stringify({ message: "Year and scoring rules applied successfuly!" }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: `Year was not addeed: ${err?.message}` ?? err }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500 
    })
  }
})