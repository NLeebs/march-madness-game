begin;
select plan(12);

select tests.clear_authentication();
select has_schema('stats', 'stats schema exists');
select has_table('stats', 'refresh_log', 'refresh_log exists');
select ok(not has_schema_privilege('anon', 'stats', 'usage'), 'anon has no usage on stats');
select ok(not has_schema_privilege('authenticated', 'stats', 'usage'), 'authenticated has no usage on stats');
select ok(not has_schema_privilege('service_role', 'stats', 'usage'), 'service_role has no usage on stats');

-- Fixture rows are created below; on a fresh DB the fingerprint starts at zero
select is(stats.inputs_fingerprint()->>'brackets', '0', 'empty DB has zero brackets');

select is(stats.inputs_changed('t', stats.inputs_fingerprint()), true, 'changed when no log row');
select stats.record_refresh('t', stats.inputs_fingerprint());
select is(stats.inputs_changed('t', stats.inputs_fingerprint()), false, 'unchanged right after record_refresh');

create temp table cap (fp jsonb);
insert into cap values (stats.inputs_fingerprint());

create temp table fx (name text primary key, id uuid);
insert into fx values
  ('y', tests.create_year(2093)),
  ('u', tests.create_user('stats-schema@test.dev')),
  ('c', tests.create_conference('stats-schema-conf', false));
insert into fx values
  ('rules', tests.create_scoring_rules((select id from fx where name = 'y'))),
  ('round', tests.create_round('stats-schema-round')),
  ('t1', tests.create_team('SS1', (select id from fx where name = 'y'), (select id from fx where name = 'c')));
insert into fx values
  ('b', tests.create_bracket((select id from fx where name = 'u'), (select id from fx where name = 'y'))),
  ('g', tests.create_game((select id from fx where name = 'y'), (select id from fx where name = 'round')));

select is(stats.inputs_changed('t', stats.inputs_fingerprint()), true, 'changed after a bracket is created');
-- race fix: a fingerprint captured before the bracket existed must not mark it processed
select stats.record_refresh('race', (select fp from cap));
select is(stats.inputs_changed('race', stats.inputs_fingerprint()), true, 'rows inserted after fingerprint capture are not considered processed');
select stats.record_refresh('t', stats.inputs_fingerprint());
select tests.create_pick(
  (select id from fx where name = 'b'), (select id from fx where name = 'g'),
  (select id from fx where name = 't1'), 1);
select is(stats.inputs_changed('t', stats.inputs_fingerprint()), true, 'changed after a pick is created');
select stats.record_refresh('t', stats.inputs_fingerprint());
delete from public.user_picks;
delete from public.user_brackets;
select is(stats.inputs_changed('t', stats.inputs_fingerprint()), true, 'changed after rows are deleted');

select * from finish();
rollback;
