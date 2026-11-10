-- Replaces the calculate_global_conference_stats Edge Function. Rebuilds
-- global_conference_stats per (year, conference) from teams, resolved games
-- (play-ins included) and all picks (anonymous brackets included). Teams with
-- no conference are skipped. Pairs with no activity are deleted. Rows whose
-- values did not change are not rewritten.
create function stats.refresh_global_conference_stats() returns void
language plpgsql security invoker set search_path = '' as $$
begin
  with team_results as (
    select t.team_id,
           (g.winning_team_id = t.team_id) as won
    from public.tournament_games g
    cross join lateral (values (g.favored_team_id), (g.underdog_team_id)) t(team_id)
    where g.winning_team_id is not null
      and t.team_id is not null
  ),
  result_agg as (
    select tm.year_id, tm.conference_id,
           count(*) filter (where r.won) as wins,
           count(*) filter (where not r.won) as losses
    from team_results r
    join public.teams tm on tm.id = r.team_id
    where tm.conference_id is not null
    group by tm.year_id, tm.conference_id
  ),
  pick_agg as (
    select tm.year_id, tm.conference_id, count(*) as picks
    from public.user_picks p
    join public.teams tm on tm.id = p.picked_team_id
    where tm.conference_id is not null
    group by tm.year_id, tm.conference_id
  ),
  conf_stats as (
    select coalesce(r.year_id, p.year_id) as year_id,
           coalesce(r.conference_id, p.conference_id) as conference_id,
           coalesce(p.picks, 0)::int as picks,
           coalesce(r.wins, 0)::int as wins,
           coalesce(r.losses, 0)::int as losses
    from result_agg r
    full join pick_agg p on p.year_id = r.year_id and p.conference_id = r.conference_id
  ),
  upserted as (
    insert into public.global_conference_stats as s (year_id, conference_id, picks, wins, losses)
    select year_id, conference_id, picks, wins, losses from conf_stats
    on conflict (year_id, conference_id) do update set
      picks = excluded.picks,
      wins = excluded.wins,
      losses = excluded.losses
    where (s.picks, s.wins, s.losses)
          is distinct from
          (excluded.picks, excluded.wins, excluded.losses)
    returning id
  )
  delete from public.global_conference_stats s
  where not exists (
    select 1 from conf_stats c
    where c.year_id = s.year_id and c.conference_id = s.conference_id);
end $$;

revoke execute on function stats.refresh_global_conference_stats()
  from public, anon, authenticated, service_role;
