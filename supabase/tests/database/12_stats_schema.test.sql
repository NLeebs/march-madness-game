begin;
select plan(20);

select tests.clear_authentication();
select has_schema('stats', 'stats schema exists');
select has_table('stats', 'refresh_log', 'refresh_log exists');
select ok(not has_schema_privilege('anon', 'stats', 'usage'), 'anon has no usage on stats');
select ok(not has_schema_privilege('authenticated', 'stats', 'usage'), 'authenticated has no usage on stats');
select ok(not has_schema_privilege('service_role', 'stats', 'usage'), 'service_role has no usage on stats');

-- The DB may already hold data (seed files, earlier runs): only compare
-- fingerprints before and after a change, never absolute values.
delete from stats.refresh_log where job in ('t', 'race');
select is(stats.inputs_changed('t', stats.inputs_fingerprint()), true, 'changed when no log row');
select stats.record_refresh('t', stats.inputs_fingerprint());
select is(stats.inputs_changed('t', stats.inputs_fingerprint()), false, 'unchanged right after record_refresh');

create temp table cap (fp jsonb);
insert into cap values (stats.inputs_fingerprint());

create temp table fx (name text primary key, id uuid);
insert into fx values
  ('y', tests.create_year(2093)),
  ('u', tests.create_user('stats-schema@test.dev')),
  ('c', tests.create_conference('stats-schema-conf', false)),
  ('c2', tests.create_conference('stats-schema-conf-2', false));
insert into fx values
  ('rules', tests.create_scoring_rules((select id from fx where name = 'y'))),
  ('round', tests.create_round('stats-schema-round')),
  ('t1', tests.create_team('SS1', (select id from fx where name = 'y'), (select id from fx where name = 'c')));
create function pg_temp.fx(p text) returns uuid language sql as $$ select id from fx where name = p $$;
select stats.record_refresh('t', stats.inputs_fingerprint());

insert into fx values
  ('b', tests.create_bracket(pg_temp.fx('u'), pg_temp.fx('y'))),
  ('g', tests.create_game(pg_temp.fx('y'), pg_temp.fx('round')));

select is(stats.inputs_changed('t', stats.inputs_fingerprint()), true, 'changed after a user bracket is created');
-- race fix: a fingerprint captured before the bracket existed must not mark it processed
select stats.record_refresh('race', (select fp from cap));
select is(stats.inputs_changed('race', stats.inputs_fingerprint()), true, 'rows inserted after fingerprint capture are not considered processed');
select stats.record_refresh('t', stats.inputs_fingerprint());
select tests.create_pick(pg_temp.fx('b'), pg_temp.fx('g'), pg_temp.fx('t1'), 1);
select is(stats.inputs_changed('t', stats.inputs_fingerprint()), true, 'changed after a pick is created');
select stats.record_refresh('t', stats.inputs_fingerprint());

-- Anonymous brackets never feed the per-user stats, so they must not trigger a refresh
insert into fx values
  ('ba', tests.create_anon_bracket(gen_random_uuid(), pg_temp.fx('y'))),
  ('ga', tests.create_game(pg_temp.fx('y'), pg_temp.fx('round')));
select tests.create_pick(pg_temp.fx('ba'), pg_temp.fx('ga'), pg_temp.fx('t1'), 1);
select is(stats.inputs_changed('t', stats.inputs_fingerprint()), false, 'anonymous bracket, game and pick do not change the fingerprint');

-- Delete one bracket and insert one with an older created_at: same count, same max(created_at)
insert into fx values ('b_new', tests.create_bracket_with_score(pg_temp.fx('u'), pg_temp.fx('y'), 0, '2000-01-01'));
select stats.record_refresh('t', stats.inputs_fingerprint());
delete from public.user_brackets where id = pg_temp.fx('b_new');
select tests.create_bracket_with_score(pg_temp.fx('u'), pg_temp.fx('y'), 0, '2000-01-01');
select is(stats.inputs_changed('t', stats.inputs_fingerprint()), true, 'delete plus backdated insert changes the fingerprint');
select stats.record_refresh('t', stats.inputs_fingerprint());

update public.user_brackets set score = 50 where id = pg_temp.fx('b');
select is(stats.inputs_changed('t', stats.inputs_fingerprint()), true, 'changed after a user bracket score is updated');
select stats.record_refresh('t', stats.inputs_fingerprint());

update public.teams set conference_id = pg_temp.fx('c2') where id = pg_temp.fx('t1');
select is(stats.inputs_changed('t', stats.inputs_fingerprint()), true, 'changed after a team changes conference');
select stats.record_refresh('t', stats.inputs_fingerprint());

delete from public.user_picks where bracket_id = pg_temp.fx('b');
select is(stats.inputs_changed('t', stats.inputs_fingerprint()), true, 'changed after picks are deleted');

-- One shared definition of a first-round upset pick
select is(stats.is_first_round_upset_pick(false, '1', 1, 16, 16), true, 'lower seed picked in round 1 is an upset pick');
select is(stats.is_first_round_upset_pick(false, '1', 1, 16, 1), false, 'favorite picked is not an upset pick');
select is(stats.is_first_round_upset_pick(true, '1', 16, 16, 16), false, 'play-in is not an upset pick');
select is(stats.is_first_round_upset_pick(false, '1', 8, 8, 8), false, 'equal seeds are not an upset pick');
select is(stats.is_first_round_upset_pick(false, '2', 1, 16, 16), false, 'later rounds are not first-round upset picks');

select * from finish();
rollback;
