begin;
select plan(9);

select tests.clear_authentication();

create temp table fx (name text primary key, id uuid);
insert into fx values
  ('y', tests.create_year(2093)),
  ('ca', tests.create_conference('gcs-power-a', true)),
  ('cb', tests.create_conference('gcs-mid-b', false)),
  ('cz', tests.create_conference('gcs-empty-z', false)),
  ('r1', tests.create_round('1')),
  ('r2', tests.create_round('2')),
  ('rs', tests.create_round('sweet sixteen')),
  ('rf', tests.create_round('finals'));
create function pg_temp.fx(p text) returns uuid language sql as $$ select id from fx where name = p $$;

insert into fx values ('rules', tests.create_scoring_rules(pg_temp.fx('y')));

-- power: A, C; mid: B, E, F, G; N has no conference
insert into fx values
  ('a',  tests.create_team('A',  pg_temp.fx('y'), pg_temp.fx('ca'))),
  ('b',  tests.create_team('B',  pg_temp.fx('y'), pg_temp.fx('cb'))),
  ('c_', tests.create_team('C',  pg_temp.fx('y'), pg_temp.fx('ca'))),
  ('e',  tests.create_team('E',  pg_temp.fx('y'), pg_temp.fx('cb'))),
  ('f',  tests.create_team('F',  pg_temp.fx('y'), pg_temp.fx('cb'))),
  ('g',  tests.create_team('G',  pg_temp.fx('y'), pg_temp.fx('cb'))),
  ('n',  tests.create_team('N',  pg_temp.fx('y'), null));

insert into fx values
  ('gp', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('e'), 16, pg_temp.fx('f'), 16, pg_temp.fx('e'), true)),
  ('g1', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('a'), 1, pg_temp.fx('e'), 16, pg_temp.fx('e'))),
  ('g2', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('c_'), 8, pg_temp.fx('b'), 8, pg_temp.fx('b'))),
  ('gs', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('rs'), pg_temp.fx('a'), 1, pg_temp.fx('b'), 8, pg_temp.fx('a'))),
  ('gf', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('rf'), pg_temp.fx('c_'), 8, pg_temp.fx('e'), 16, pg_temp.fx('c_'))),
  ('gu', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r2'), pg_temp.fx('a'), 1, pg_temp.fx('c_'), 8, null)),
  ('gn', tests.create_played_game(pg_temp.fx('y'), pg_temp.fx('r1'), pg_temp.fx('n'), 5, pg_temp.fx('b'), 12, pg_temp.fx('n')));
insert into fx values ('ba', tests.create_anon_bracket(gen_random_uuid(), pg_temp.fx('y')));

do $$ begin
  perform tests.create_pick(pg_temp.fx('ba'), pg_temp.fx('g1'), pg_temp.fx('a'), 1);
  perform tests.create_pick(pg_temp.fx('ba'), pg_temp.fx('gf'), pg_temp.fx('c_'), 8);
  perform tests.create_pick(pg_temp.fx('ba'), pg_temp.fx('gu'), pg_temp.fx('c_'), 8);
  perform tests.create_pick(pg_temp.fx('ba'), pg_temp.fx('gn'), pg_temp.fx('n'), 5);
end $$;

-- stale row for a conference with no teams
insert into public.global_conference_stats (year_id, conference_id, picks, wins, losses)
values (pg_temp.fx('y'), pg_temp.fx('cz'), 9, 9, 9);

select lives_ok($$select stats.refresh_global_conference_stats()$$, 'refresh runs');

create function pg_temp.row_of(p text) returns text language sql as $$
  select (wins, losses, picks)::text from public.global_conference_stats
  where year_id = pg_temp.fx('y') and conference_id = pg_temp.fx(p) $$;

select is(pg_temp.row_of('cb'), '(3,4,0)', 'Mid: play-in counts; losses to null-conference team count');
select is(pg_temp.row_of('ca'), '(2,2,3)', 'Power: unresolved game gives no win/loss, picks still count');
select is(pg_temp.row_of('cz'), null, 'row for conference without activity is deleted');
select is((select count(*) from public.global_conference_stats where year_id = pg_temp.fx('y')), 2::bigint, 'only Power and Mid rows');
select is((select count(*) from public.global_conference_stats where conference_id is null), 0::bigint, 'no null-conference row');

create temp table before_ctid as
  select id, ctid::text as old_ctid from public.global_conference_stats where year_id = pg_temp.fx('y');
select lives_ok($$select stats.refresh_global_conference_stats()$$, 'second refresh upserts without error');
select is((select count(*) from public.global_conference_stats where year_id = pg_temp.fx('y')), 2::bigint, 'still two rows after rerun');
select is_empty(
  $q$select b.id from before_ctid b join public.global_conference_stats s using (id) where s.ctid::text <> b.old_ctid$q$,
  'rerun with unchanged inputs rewrites no rows');

select * from finish();
rollback;
