begin;
select plan(18);

select tests.clear_authentication();
create temp table fx (name text primary key, id uuid);
grant all on fx to anon, authenticated;
insert into fx values
  ('user_a', tests.create_user('stats-a@test.dev')),
  ('user_b', tests.create_user('stats-b@test.dev')),
  ('year', tests.create_year(2093)),
  ('conf', tests.create_conference('Stats Conf', false));
insert into fx values ('team', tests.create_team('Stats Team', (select id from fx where name = 'year'), (select id from fx where name = 'conf')));
select tests.create_scoring_rules((select id from fx where name = 'year'));
insert into fx values
  ('bracket_a', tests.create_bracket((select id from fx where name = 'user_a'), (select id from fx where name = 'year'))),
  ('bracket_b', tests.create_bracket((select id from fx where name = 'user_b'), (select id from fx where name = 'year')));

insert into public.global_team_stats (year_id, team_id)
  values ((select id from fx where name = 'year'), (select id from fx where name = 'team'));
insert into public.global_conference_stats (year_id, conference_id)
  values ((select id from fx where name = 'year'), (select id from fx where name = 'conf'));
insert into public.user_bracket_stats (user_id, bracket_id, year_id) values
  ((select id from fx where name = 'user_a'), (select id from fx where name = 'bracket_a'), (select id from fx where name = 'year')),
  ((select id from fx where name = 'user_b'), (select id from fx where name = 'bracket_b'), (select id from fx where name = 'year'));
insert into public.user_total_stats (user_id, year_id, total_brackets, total_picks, high_score, low_score, average_score, champions_guessed_correctly)
  select id, (select id from fx where name = 'year'), 1, 1, 1, 1, 1, 0 from fx where name in ('user_a', 'user_b');

select tests.authenticate_as_anon();
select is((select count(*) from public.global_team_stats), 0::bigint, 'anon sees no global_team_stats');
select is((select count(*) from public.global_conference_stats), 0::bigint, 'anon sees no global_conference_stats');
select is((select count(*) from public.user_bracket_stats), 0::bigint, 'anon sees no user_bracket_stats');
select is((select count(*) from public.user_total_stats), 0::bigint, 'anon sees no user_total_stats');

select tests.authenticate_as((select id from fx where name = 'user_a'));
select is((select count(*) from public.global_team_stats), 1::bigint, 'authenticated sees global_team_stats');
select is((select count(*) from public.global_conference_stats), 1::bigint, 'authenticated sees global_conference_stats');
select is((select count(*) from public.user_bracket_stats), 1::bigint, 'A sees exactly one user_bracket_stats row');
select is((select user_id from public.user_bracket_stats), (select id from fx where name = 'user_a'), 'the visible user_bracket_stats row is owned by A');
select is((select count(*) from public.user_total_stats), 1::bigint, 'A sees exactly one user_total_stats row');
select is((select user_id from public.user_total_stats), (select id from fx where name = 'user_a'), 'the visible user_total_stats row is owned by A');

select throws_ok($$insert into public.global_team_stats (year_id, team_id) values ((select id from fx where name = 'year'), gen_random_uuid())$$,
  '42501', null, 'authenticated cannot insert global_team_stats');
select throws_ok($$insert into public.global_conference_stats (year_id, conference_id) values ((select id from fx where name = 'year'), gen_random_uuid())$$,
  '42501', null, 'authenticated cannot insert global_conference_stats');
select throws_ok($$insert into public.user_bracket_stats (user_id, bracket_id, year_id) values ((select id from fx where name = 'user_a'), gen_random_uuid(), (select id from fx where name = 'year'))$$,
  '42501', null, 'authenticated cannot insert user_bracket_stats');
select throws_ok($$insert into public.user_total_stats (user_id, year_id, total_brackets, total_picks, high_score, low_score, average_score, champions_guessed_correctly) values (gen_random_uuid(), (select id from fx where name = 'year'), 1, 1, 1, 1, 1, 0)$$,
  '42501', null, 'authenticated cannot insert user_total_stats');

select tests.authenticate_as_anon();
select throws_ok($$insert into public.global_team_stats (year_id, team_id) values ((select id from fx where name = 'year'), gen_random_uuid())$$,
  '42501', null, 'anon cannot insert global_team_stats');
select throws_ok($$insert into public.global_conference_stats (year_id, conference_id) values ((select id from fx where name = 'year'), gen_random_uuid())$$,
  '42501', null, 'anon cannot insert global_conference_stats');
select throws_ok($$insert into public.user_bracket_stats (user_id, bracket_id, year_id) values ((select id from fx where name = 'user_a'), gen_random_uuid(), (select id from fx where name = 'year'))$$,
  '42501', null, 'anon cannot insert user_bracket_stats');
select throws_ok($$insert into public.user_total_stats (user_id, year_id, total_brackets, total_picks, high_score, low_score, average_score, champions_guessed_correctly) values (gen_random_uuid(), (select id from fx where name = 'year'), 1, 1, 1, 1, 1, 0)$$,
  '42501', null, 'anon cannot insert user_total_stats');
select tests.clear_authentication();

select * from finish();
rollback;
