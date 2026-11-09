begin;
select plan(7);

select tests.clear_authentication();

create temp table fx (name text primary key, id uuid);
insert into fx values
  ('y', tests.create_year(2092)),
  ('r1', tests.create_round('1')),
  ('r2', tests.create_round('2')),
  ('c', tests.create_conference('sms-conf', true));
create function pg_temp.fx(p text) returns uuid language sql as $$ select id from fx where name = p $$;

insert into fx values
  ('a', tests.create_team('A', pg_temp.fx('y'), pg_temp.fx('c'))),
  ('b', tests.create_team('B', pg_temp.fx('y'), pg_temp.fx('c')));

insert into fx values
  ('gp', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('a'), 16, pg_temp.fx('b'), 16, pg_temp.fx('a'), true)),
  ('g1', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('a'), 1, pg_temp.fx('b'), 16, pg_temp.fx('a'))),
  ('g2', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('a'), 1, pg_temp.fx('b'), 16, pg_temp.fx('b'))),
  ('g3', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('a'), 8, pg_temp.fx('b'), 8, pg_temp.fx('b'))),
  ('gu', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r2'), pg_temp.fx('a'), 1, pg_temp.fx('b'), 8, null));

-- stale row
insert into public.seed_matchup_stats (year_id, round_id, higher_seed, lower_seed, higher_seed_wins, lower_seed_wins, total_games, upset_percentage)
values (pg_temp.fx('y'), pg_temp.fx('r2'), 2, 15, 1, 0, 1, 0);

select lives_ok($$select stats.refresh_seed_matchup_stats()$$, 'refresh runs');

create function pg_temp.row_of(p_round text, p_hi int, p_lo int) returns text language sql as $$
  select (higher_seed_wins, lower_seed_wins, total_games, upset_percentage)::text
  from public.seed_matchup_stats
  where year_id = pg_temp.fx('y') and round_id = pg_temp.fx(p_round)
    and higher_seed = p_hi and lower_seed = p_lo $$;

select is(pg_temp.row_of('r1', 1, 16), '(1,1,2,50.0)', '1 vs 16: one win each, 50.0 upset');
select is(pg_temp.row_of('r1', 8, 8), '(0,1,1,100.0)', '8 vs 8 underdog win, 100.0 upset');
select is(pg_temp.row_of('r2', 2, 15), null, 'stale row deleted');
select is((select count(*) from public.seed_matchup_stats), 2::bigint, 'play-in and unresolved excluded: exactly two rows');

select lives_ok($$select stats.refresh_seed_matchup_stats()$$, 'second refresh upserts without error');
select is((select count(*) from public.seed_matchup_stats), 2::bigint, 'still two rows after rerun');

select * from finish();
rollback;
