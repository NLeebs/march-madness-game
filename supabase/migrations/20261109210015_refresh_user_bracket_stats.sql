-- Replaces the calculate_bracket_stats Edge Function. Returns false (without
-- writing) when inputs are unchanged since the last refresh, otherwise rebuilds
-- user_bracket_stats for every non-anonymous bracket and returns true. Rows whose
-- values did not change are not rewritten. p_fp lets stats.refresh_user_stats()
-- pass one fingerprint to both per-user jobs; null means compute it here.
create function stats.refresh_user_bracket_stats(p_fp jsonb default null) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  v_fp jsonb := coalesce(p_fp, stats.inputs_fingerprint());
begin
  if not stats.inputs_changed('user_bracket_stats', v_fp) then
    return false;
  end if;

  with resolved as (
    select p.bracket_id,
           p.picked_team_id,
           p.created_at,
           g.winning_team_id,
           r.round_name,
           stats.is_first_round_upset_pick(g.is_play_in, r.round_name, g.favored_team_seed,
                                           g.underdog_team_seed, p.picked_team_seed) as is_upset_pick
    from public.user_picks p
    join public.user_brackets b on b.id = p.bracket_id
    join public.tournament_games g on g.id = p.game_id
    join public.rounds r on r.id = g.round_id
    where g.winning_team_id is not null
      and b.user_id is not null
  ),
  agg as (
    select bracket_id,
           count(*) as games_played,
           count(*) filter (where picked_team_id = winning_team_id) as correct_picks,
           count(*) filter (where picked_team_id is not null
                              and picked_team_id <> winning_team_id) as incorrect_picks,
           count(*) filter (where is_upset_pick) as upsets_picked,
           count(*) filter (where is_upset_pick
                              and picked_team_id = winning_team_id) as upsets_correct
    from resolved
    group by bracket_id
  ),
  champ as (
    select distinct on (bracket_id)
           bracket_id,
           picked_team_id as champion_picked_team_id,
           coalesce(picked_team_id = winning_team_id, false) as champion_correct
    from resolved
    where round_name = 'finals'
    order by bracket_id, created_at desc nulls last
  )
  insert into public.user_bracket_stats as s
    (bracket_id, user_id, year_id, games_played, correct_picks, incorrect_picks,
     first_round_upsets_picked, first_round_upsets_correct,
     champion_picked_team_id, champion_correct)
  select b.id, b.user_id, b.year_id,
         coalesce(a.games_played, 0),
         coalesce(a.correct_picks, 0),
         coalesce(a.incorrect_picks, 0),
         coalesce(a.upsets_picked, 0),
         coalesce(a.upsets_correct, 0),
         c.champion_picked_team_id,
         coalesce(c.champion_correct, false)
  from public.user_brackets b
  left join agg a on a.bracket_id = b.id
  left join champ c on c.bracket_id = b.id
  where b.user_id is not null
  on conflict (bracket_id) do update set
    user_id = excluded.user_id,
    year_id = excluded.year_id,
    games_played = excluded.games_played,
    correct_picks = excluded.correct_picks,
    incorrect_picks = excluded.incorrect_picks,
    first_round_upsets_picked = excluded.first_round_upsets_picked,
    first_round_upsets_correct = excluded.first_round_upsets_correct,
    champion_picked_team_id = excluded.champion_picked_team_id,
    champion_correct = excluded.champion_correct
  where (s.user_id, s.year_id, s.games_played, s.correct_picks, s.incorrect_picks,
         s.first_round_upsets_picked, s.first_round_upsets_correct,
         s.champion_picked_team_id, s.champion_correct)
        is distinct from
        (excluded.user_id, excluded.year_id, excluded.games_played, excluded.correct_picks,
         excluded.incorrect_picks, excluded.first_round_upsets_picked,
         excluded.first_round_upsets_correct, excluded.champion_picked_team_id,
         excluded.champion_correct);

  delete from public.user_bracket_stats s
  where not exists (
    select 1 from public.user_brackets b
    where b.id = s.bracket_id and b.user_id is not null);

  perform stats.record_refresh('user_bracket_stats', v_fp);
  return true;
end $$;

revoke execute on function stats.refresh_user_bracket_stats(jsonb)
  from public, anon, authenticated, service_role;
