-- Replaces the inset-new-year Edge Function. Inserts the current (UTC) year and
-- its scoring rules; existing rows are left untouched.
create function stats.add_current_year() returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_year int := extract(year from now() at time zone 'utc')::int;
  v_year_id uuid;
begin
  insert into public.years (year) values (v_year) on conflict (year) do nothing;
  select id into v_year_id from public.years where year = v_year;

  insert into public.tournament_scoring_rules (year_id, description, version)
  values (
    v_year_id,
    'This bracket is calculated based off of a 64 team bracket with four playin games. Players are awared points for each correct guess of a team reaching the next round. An increasing number of points is rewarded as the rounds progress. Correct picks for the first round are awarded 10pts. 20pts for the second round. 40pts for the sweet sixteen. 80pts for the elite eight. 160pts for the final four. 320pts for the finals.',
    '1.0.0')
  on conflict (year_id) do nothing;
end $$;

revoke execute on function stats.add_current_year()
  from public, anon, authenticated, service_role;
