-- Replaces the calculate_global_team_stats Edge Function. Rebuilds one
-- global_team_stats row per team from all games and picks (anonymous brackets
-- included). No skip check: always runs. Points, upsets and championships only
-- count resolved games (winning_team_id not null); appearance counts and picks
-- do not need a resolved game. Rows whose values did not change are not
-- rewritten.
create function stats.refresh_global_team_stats() returns void
language plpgsql security invoker set search_path = '' as $$
begin
  with latest_score as (
    select distinct on (round_id) round_id, score
    from public.tournament_round_scoring
    order by round_id, created_at desc
  ),
  team_games as (
    select t.team_id,
           r.round_name,
           g.is_play_in is true as is_play_in,
           g.winning_team_id is not null as resolved,
           g.winning_team_id = t.team_id as won,
           (g.winning_team_id = t.team_id
             and g.favored_team_seed <> g.underdog_team_seed
             and t.is_underdog) as caused_upset,
           (g.winning_team_id is not null
             and g.winning_team_id <> t.team_id
             and g.favored_team_seed <> g.underdog_team_seed
             and t.is_favored) as was_upset,
           coalesce(ls.score, 0) as score
    from public.tournament_games g
    join public.rounds r on r.id = g.round_id
    left join latest_score ls on ls.round_id = g.round_id
    cross join lateral (values
      (g.favored_team_id, true, false),
      (g.underdog_team_id, false, true)
    ) t(team_id, is_favored, is_underdog)
    where t.team_id is not null
  ),
  game_agg as (
    select team_id,
           coalesce(sum(score) filter (where won and not is_play_in), 0) as points,
           count(*) filter (where won and round_name = 'finals') as championships,
           count(*) filter (where round_name = '2') as second_rounds,
           count(*) filter (where round_name = 'sweet sixteen') as sweet_sixteens,
           count(*) filter (where round_name = 'elite eight') as elite_eights,
           count(*) filter (where round_name = 'final four') as final_fours,
           count(*) filter (where round_name = 'finals') as finals,
           count(*) filter (where round_name = '1' and not is_play_in)
             + count(*) filter (where round_name = '1' and is_play_in
                                  and resolved and not won) as appearances,
           count(*) filter (where caused_upset and not is_play_in) as upsets_caused,
           count(*) filter (where was_upset and not is_play_in) as times_upset
    from team_games
    group by team_id
  ),
  pick_agg as (
    select picked_team_id as team_id, count(*) as picks
    from public.user_picks
    where picked_team_id is not null
    group by picked_team_id
  )
  insert into public.global_team_stats as s
    (year_id, team_id, picks, tournament_points_scored, championships, finals,
     final_fours, elite_eights, sweet_sixteens, second_rounds,
     tournament_appearances, upsets_caused, times_upset)
  select t.year_id, t.id,
         coalesce(p.picks, 0),
         coalesce(a.points, 0),
         coalesce(a.championships, 0),
         coalesce(a.finals, 0),
         coalesce(a.final_fours, 0),
         coalesce(a.elite_eights, 0),
         coalesce(a.sweet_sixteens, 0),
         coalesce(a.second_rounds, 0),
         coalesce(a.appearances, 0),
         coalesce(a.upsets_caused, 0),
         coalesce(a.times_upset, 0)
  from public.teams t
  left join game_agg a on a.team_id = t.id
  left join pick_agg p on p.team_id = t.id
  on conflict (year_id, team_id) do update set
    picks = excluded.picks,
    tournament_points_scored = excluded.tournament_points_scored,
    championships = excluded.championships,
    finals = excluded.finals,
    final_fours = excluded.final_fours,
    elite_eights = excluded.elite_eights,
    sweet_sixteens = excluded.sweet_sixteens,
    second_rounds = excluded.second_rounds,
    tournament_appearances = excluded.tournament_appearances,
    upsets_caused = excluded.upsets_caused,
    times_upset = excluded.times_upset
  where (s.picks, s.tournament_points_scored, s.championships, s.finals, s.final_fours,
         s.elite_eights, s.sweet_sixteens, s.second_rounds, s.tournament_appearances,
         s.upsets_caused, s.times_upset)
        is distinct from
        (excluded.picks, excluded.tournament_points_scored, excluded.championships,
         excluded.finals, excluded.final_fours, excluded.elite_eights, excluded.sweet_sixteens,
         excluded.second_rounds, excluded.tournament_appearances, excluded.upsets_caused,
         excluded.times_upset);
end $$;

revoke execute on function stats.refresh_global_team_stats()
  from public, anon, authenticated, service_role;
