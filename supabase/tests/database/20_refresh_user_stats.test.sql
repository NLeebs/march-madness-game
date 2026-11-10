begin;
select plan(5);

select tests.clear_authentication();
delete from stats.refresh_log where job in ('user_bracket_stats', 'user_total_stats');

create temp table fx (name text primary key, id uuid);
insert into fx values
  ('y', tests.create_year(2091)),
  ('u', tests.create_user('urs-u@test.dev'));
insert into fx values ('rules', tests.create_scoring_rules((select id from fx where name = 'y')));
insert into fx values ('b', tests.create_bracket((select id from fx where name = 'u'), (select id from fx where name = 'y')));
create function pg_temp.fx(p text) returns uuid language sql as $$ select id from fx where name = p $$;

-- One job computes the fingerprint once and runs both per-user refreshes
select lives_ok($$select stats.refresh_user_stats()$$, 'refresh_user_stats runs');
select is((select count(*) from public.user_bracket_stats where bracket_id = pg_temp.fx('b')), 1::bigint,
  'user_bracket_stats refreshed');
select is((select count(*) from public.user_total_stats where user_id = pg_temp.fx('u')), 1::bigint,
  'user_total_stats refreshed');
select is((select fingerprint from stats.refresh_log where job = 'user_bracket_stats'),
          (select fingerprint from stats.refresh_log where job = 'user_total_stats'),
  'both jobs record the same fingerprint');
select is((select fingerprint from stats.refresh_log where job = 'user_total_stats'),
          stats.inputs_fingerprint(), 'recorded fingerprint matches current inputs');

select * from finish();
rollback;
