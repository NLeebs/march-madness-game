-- Replaces the calculate_seed_matchup_stats Edge Function. Rebuilds
-- seed_matchup_stats per (year, round, higher seed, lower seed) from resolved,
-- non-play-in games. Combinations with no games are deleted.
create function stats.refresh_seed_matchup_stats() returns void
language plpgsql security invoker set search_path = '' as $$
begin
  with matchups as (
    select g.year_id, g.round_id,
           g.favored_team_seed as higher_seed,
           g.underdog_team_seed as lower_seed,
           (count(*) filter (where g.winning_team_id = g.favored_team_id))::int as higher_seed_wins,
           (count(*) filter (where g.winning_team_id = g.underdog_team_id))::int as lower_seed_wins
    from public.tournament_games g
    where g.winning_team_id is not null
      and not g.is_play_in
    group by g.year_id, g.round_id, g.favored_team_seed, g.underdog_team_seed
  ),
  computed as (
    select year_id, round_id, higher_seed, lower_seed, higher_seed_wins, lower_seed_wins,
           higher_seed_wins + lower_seed_wins as total_games,
           case when higher_seed_wins + lower_seed_wins = 0 then 0
                else round(100.0 * lower_seed_wins / (higher_seed_wins + lower_seed_wins), 1)
           end as upset_percentage
    from matchups
  ),
  upserted as (
    insert into public.seed_matchup_stats
      (year_id, round_id, higher_seed, lower_seed, higher_seed_wins, lower_seed_wins, total_games, upset_percentage)
    select year_id, round_id, higher_seed, lower_seed, higher_seed_wins, lower_seed_wins, total_games, upset_percentage
    from computed
    on conflict (year_id, round_id, higher_seed, lower_seed) do update set
      higher_seed_wins = excluded.higher_seed_wins,
      lower_seed_wins = excluded.lower_seed_wins,
      total_games = excluded.total_games,
      upset_percentage = excluded.upset_percentage
    returning id
  )
  delete from public.seed_matchup_stats s
  where not exists (
    select 1 from computed c
    where c.year_id = s.year_id and c.round_id = s.round_id
      and c.higher_seed = s.higher_seed and c.lower_seed = s.lower_seed);
end $$;

revoke execute on function stats.refresh_seed_matchup_stats()
  from public, anon, authenticated, service_role;
