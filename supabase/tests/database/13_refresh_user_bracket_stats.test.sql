begin;
select plan(10);

select tests.clear_authentication();

-- Empty DB: first call refreshes (no log row) and leaves the table empty
select is(stats.refresh_user_bracket_stats(), true, 'first call on empty DB returns true');
select is((select count(*) from public.user_bracket_stats), 0::bigint, 'empty DB produces no stats rows');

create temp table fx (name text primary key, id uuid);
insert into fx values
  ('y', tests.create_year(2094)),
  ('u1', tests.create_user('ubs-u1@test.dev')),
  ('c', tests.create_conference('ubs-conf', false)),
  ('r1', tests.create_round('1')),
  ('r2', tests.create_round('2')),
  ('rf', tests.create_round('finals'));
insert into fx values ('rules', tests.create_scoring_rules((select id from fx where name = 'y')));
insert into fx
  select t.n, tests.create_team(upper(t.n), (select id from fx where name = 'y'), (select id from fx where name = 'c'))
  from (values ('a'), ('b'), ('c_'), ('d'), ('e'), ('f')) t(n);

create function pg_temp.fx(p text) returns uuid language sql as $$ select id from fx where name = p $$;

insert into fx values
  ('g1', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('a'), 1, pg_temp.fx('b'), 16, pg_temp.fx('b'))),
  ('g2', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('c_'), 4, pg_temp.fx('d'), 13, pg_temp.fx('c_'))),
  ('g3', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('e'), 16, pg_temp.fx('f'), 16, pg_temp.fx('e'), true)),
  ('g4', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('a'), 8, pg_temp.fx('c_'), 8, pg_temp.fx('c_'))),
  ('g5', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('rf'), pg_temp.fx('c_'), 4, pg_temp.fx('b'), 16, pg_temp.fx('c_'))),
  ('g6', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r2'), pg_temp.fx('a'), 1, pg_temp.fx('d'), 13, null)),
  ('g7', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r2'), pg_temp.fx('a'), 1, pg_temp.fx('d'), 13, pg_temp.fx('a')));
insert into fx values
  ('b1', tests.create_bracket(pg_temp.fx('u1'), pg_temp.fx('y'))),
  ('b2', tests.create_bracket(pg_temp.fx('u1'), pg_temp.fx('y'))),
  ('ba', tests.create_anon_bracket(gen_random_uuid(), pg_temp.fx('y')));

do $$ begin
  perform tests.create_pick(pg_temp.fx('b1'), pg_temp.fx('g1'), pg_temp.fx('b'), 16);
  perform tests.create_pick(pg_temp.fx('b1'), pg_temp.fx('g2'), pg_temp.fx('d'), 13);
  perform tests.create_pick(pg_temp.fx('b1'), pg_temp.fx('g3'), pg_temp.fx('e'), 16);
  perform tests.create_pick(pg_temp.fx('b1'), pg_temp.fx('g4'), pg_temp.fx('c_'), 8);
  perform tests.create_pick(pg_temp.fx('b1'), pg_temp.fx('g5'), pg_temp.fx('c_'), 4);
  perform tests.create_pick(pg_temp.fx('b1'), pg_temp.fx('g6'), pg_temp.fx('a'), 1);
  perform tests.create_pick(pg_temp.fx('b1'), pg_temp.fx('g7'), null, null);
  perform tests.create_pick(pg_temp.fx('ba'), pg_temp.fx('g1'), pg_temp.fx('a'), 1);
end $$;

select is(stats.refresh_user_bracket_stats(), true, 'returns true when inputs changed');

select results_eq(
  format($q$select games_played, correct_picks, incorrect_picks, first_round_upsets_picked,
    first_round_upsets_correct, champion_picked_team_id, champion_correct
    from public.user_bracket_stats where bracket_id = %L$q$, pg_temp.fx('b1')),
  format('select 6, 4, 1, 2, 1, %L::uuid, true', pg_temp.fx('c_')),
  'b1 stats: play-ins and equal seeds are not upsets, unresolved/null picks skipped');

select results_eq(
  format($q$select games_played, correct_picks, incorrect_picks, first_round_upsets_picked,
    first_round_upsets_correct, champion_picked_team_id, champion_correct
    from public.user_bracket_stats where bracket_id = %L$q$, pg_temp.fx('b2')),
  $q$select 0, 0, 0, 0, 0, null::uuid, false$q$,
  'bracket with no picks gets zeros');

select is((select count(*) from public.user_bracket_stats where bracket_id = pg_temp.fx('ba')),
  0::bigint, 'anonymous bracket has no stats row');
select is((select count(*) from public.user_bracket_stats), 2::bigint, 'one row per user bracket');

select is(stats.refresh_user_bracket_stats(), false, 'second call returns false when inputs unchanged');

select tests.create_pick(pg_temp.fx('b2'), pg_temp.fx('g5'), pg_temp.fx('b'), 16);
select is(stats.refresh_user_bracket_stats(), true, 'returns true after a new pick');

select results_eq(
  format($q$select games_played, correct_picks, incorrect_picks, first_round_upsets_picked,
    first_round_upsets_correct, champion_picked_team_id, champion_correct
    from public.user_bracket_stats where bracket_id = %L$q$, pg_temp.fx('b2')),
  format('select 1, 0, 1, 0, 0, %L::uuid, false', pg_temp.fx('b')),
  'b2 stats reflect the new champion pick');

select * from finish();
rollback;
