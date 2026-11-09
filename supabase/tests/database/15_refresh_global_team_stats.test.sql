begin;
select plan(10);

select tests.clear_authentication();

create temp table fx (name text primary key, id uuid);
insert into fx values
  ('y', tests.create_year(2092)),
  ('c', tests.create_conference('gts-conf', false)),
  ('r1', tests.create_round('1')),
  ('r2', tests.create_round('2')),
  ('rs', tests.create_round('sweet sixteen')),
  ('rf', tests.create_round('finals'));
insert into fx values ('rules', tests.create_scoring_rules((select id from fx where name = 'y')));
insert into fx
  select t.n, tests.create_team(upper(t.n), (select id from fx where name = 'y'), (select id from fx where name = 'c'))
  from (values ('a'), ('b'), ('c_'), ('e'), ('f'), ('g')) t(n);

create function pg_temp.fx(p text) returns uuid language sql as $$ select id from fx where name = p $$;

-- scoring only for round '1' (10) and finals (320); sweet sixteen has none
insert into public.tournament_round_scoring (round_id, score)
values (pg_temp.fx('r1'), 10), (pg_temp.fx('rf'), 320);

insert into fx values
  ('gp', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('e'), 16, pg_temp.fx('f'), 16, pg_temp.fx('e'), true)),
  ('g1', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('a'), 1, pg_temp.fx('e'), 16, pg_temp.fx('e'))),
  ('g2', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('c_'), 8, pg_temp.fx('b'), 8, pg_temp.fx('b'))),
  ('gs', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('rs'), pg_temp.fx('a'), 1, pg_temp.fx('b'), 8, pg_temp.fx('a'))),
  ('gf', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('rf'), pg_temp.fx('c_'), 8, pg_temp.fx('e'), 16, pg_temp.fx('c_'))),
  ('gu', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r2'), pg_temp.fx('a'), 1, pg_temp.fx('c_'), 8, null));
insert into fx values ('ba', tests.create_anon_bracket(gen_random_uuid(), pg_temp.fx('y')));

do $$ begin
  perform tests.create_pick(pg_temp.fx('ba'), pg_temp.fx('g1'), pg_temp.fx('a'), 1);
  perform tests.create_pick(pg_temp.fx('ba'), pg_temp.fx('gf'), pg_temp.fx('c_'), 8);
  perform tests.create_pick(pg_temp.fx('ba'), pg_temp.fx('gu'), pg_temp.fx('c_'), 8);
end $$;

select lives_ok($$select stats.refresh_global_team_stats()$$, 'refresh runs');

create function pg_temp.row_of(p text) returns text language sql as $$
  select (picks, tournament_points_scored, championships, finals, sweet_sixteens,
          second_rounds, tournament_appearances, upsets_caused, times_upset)::text
  from public.global_team_stats where team_id = pg_temp.fx(p) $$;

select is(pg_temp.row_of('a'),  '(1,0,0,0,1,1,1,0,1)',   'A: no sweet sixteen scoring row means 0 points');
select is(pg_temp.row_of('b'),  '(0,10,0,0,1,0,1,0,0)',  'B: equal-seed win is not an upset');
select is(pg_temp.row_of('c_'), '(2,320,1,1,0,1,1,0,0)', 'C: only the finals win scores');
select is(pg_temp.row_of('e'),  '(0,10,0,1,0,0,1,1,0)',  'E: play-in excluded from points, not double-counted');
select is(pg_temp.row_of('f'),  '(0,0,0,0,0,0,1,0,0)',   'F: play-in loser still made the field');
select is(pg_temp.row_of('g'),  '(0,0,0,0,0,0,0,0,0)',   'G: no activity gives zeros');
select is((select count(*) from public.global_team_stats), 6::bigint, 'one row per team');

select lives_ok($$select stats.refresh_global_team_stats()$$, 'second refresh upserts without error');
select is((select count(*) from public.global_team_stats), 6::bigint, 'still one row per team after rerun');

select * from finish();
rollback;
