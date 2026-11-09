begin;
select plan(32);

select tests.clear_authentication();
create temp table fx (name text primary key, id uuid);
grant all on fx to anon, authenticated;
insert into fx values
  ('user_a', tests.create_user('ref-a@test.dev')),
  ('year', tests.create_year(2091)),
  ('round', tests.create_round('fixture round')),
  ('conf', tests.create_conference('Fixture Conf', false));
select tests.create_scoring_rules((select id from fx where name = 'year'));
select tests.create_team('Fixture Team', (select id from fx where name = 'year'), (select id from fx where name = 'conf'));
select tests.create_game((select id from fx where name = 'year'), (select id from fx where name = 'round'));
insert into public.seed_matchup_stats (year_id, round_id, lower_seed, higher_seed)
  values ((select id from fx where name = 'year'), (select id from fx where name = 'round'), 1, 16);
insert into public.tournament_round_scoring (round_id, score)
  values ((select id from fx where name = 'round'), 10);

-- Readable by anon and authenticated: one fixture row each
select tests.authenticate_as_anon();
select is((select count(*) from public.years), 1::bigint, 'anon sees years');
select is((select count(*) from public.teams), 1::bigint, 'anon sees teams');
select is((select count(*) from public.conferences), 1::bigint, 'anon sees conferences');
select is((select count(*) from public.rounds), 1::bigint, 'anon sees rounds');
select is((select count(*) from public.tournament_games), 1::bigint, 'anon sees tournament_games');
select is((select count(*) from public.tournament_scoring_rules), 1::bigint, 'anon sees tournament_scoring_rules');
select is((select count(*) from public.seed_matchup_stats), 1::bigint, 'anon sees seed_matchup_stats');

select tests.authenticate_as((select id from fx where name = 'user_a'));
select is((select count(*) from public.years), 1::bigint, 'authenticated sees years');
select is((select count(*) from public.teams), 1::bigint, 'authenticated sees teams');
select is((select count(*) from public.conferences), 1::bigint, 'authenticated sees conferences');
select is((select count(*) from public.rounds), 1::bigint, 'authenticated sees rounds');
select is((select count(*) from public.tournament_games), 1::bigint, 'authenticated sees tournament_games');
select is((select count(*) from public.tournament_scoring_rules), 1::bigint, 'authenticated sees tournament_scoring_rules');
select is((select count(*) from public.seed_matchup_stats), 1::bigint, 'authenticated sees seed_matchup_stats');

-- Direct inserts denied (authenticated)
select throws_ok($$insert into public.tournament_scoring_rules (year_id, description, version) values ((select id from fx where name = 'year'), 'x', 'x')$$,
  '42501', null, 'authenticated cannot insert tournament_scoring_rules');
select throws_ok($$insert into public.seed_matchup_stats (year_id, round_id) values ((select id from fx where name = 'year'), (select id from fx where name = 'round'))$$,
  '42501', null, 'authenticated cannot insert seed_matchup_stats');
select throws_ok($$insert into public.years (year) values (2092)$$, '42501', null, 'authenticated cannot insert years');
select throws_ok($$insert into public.teams (name, year_id) values ('x', (select id from fx where name = 'year'))$$,
  '42501', null, 'authenticated cannot insert teams');
select throws_ok($$insert into public.conferences (conference) values ('x')$$, '42501', null, 'authenticated cannot insert conferences');
select throws_ok($$insert into public.rounds (round_name) values ('x')$$, '42501', null, 'authenticated cannot insert rounds');

-- Direct inserts denied (anon)
select tests.authenticate_as_anon();
select throws_ok($$insert into public.tournament_scoring_rules (year_id, description, version) values ((select id from fx where name = 'year'), 'x', 'x')$$,
  '42501', null, 'anon cannot insert tournament_scoring_rules');
select throws_ok($$insert into public.seed_matchup_stats (year_id, round_id) values ((select id from fx where name = 'year'), (select id from fx where name = 'round'))$$,
  '42501', null, 'anon cannot insert seed_matchup_stats');
select throws_ok($$insert into public.years (year) values (2092)$$, '42501', null, 'anon cannot insert years');
select throws_ok($$insert into public.teams (name, year_id) values ('x', (select id from fx where name = 'year'))$$,
  '42501', null, 'anon cannot insert teams');
select throws_ok($$insert into public.conferences (conference) values ('x')$$, '42501', null, 'anon cannot insert conferences');
select throws_ok($$insert into public.rounds (round_name) values ('x')$$, '42501', null, 'anon cannot insert rounds');

-- tournament_round_scoring: role-claim based select
select is((select count(*) from public.tournament_round_scoring), 0::bigint, 'anon sees no tournament_round_scoring');

select tests.authenticate_as((select id from fx where name = 'user_a'));
select is((select count(*) from public.tournament_round_scoring), 0::bigint, 'authenticated without user_role sees no tournament_round_scoring');

select tests.authenticate_as((select id from fx where name = 'user_a'), '{"user_role":"admin"}');
select is((select count(*) from public.tournament_round_scoring), 1::bigint, 'user_role admin sees tournament_round_scoring');
select tests.authenticate_as((select id from fx where name = 'user_a'), '{"user_role":"scorer"}');
select is((select count(*) from public.tournament_round_scoring), 1::bigint, 'user_role scorer sees tournament_round_scoring');
select tests.authenticate_as((select id from fx where name = 'user_a'), '{"user_role":"organizer"}');
select is((select count(*) from public.tournament_round_scoring), 1::bigint, 'user_role organizer sees tournament_round_scoring');
select tests.authenticate_as((select id from fx where name = 'user_a'), '{"user_role":"player"}');
select is((select count(*) from public.tournament_round_scoring), 0::bigint, 'user_role player sees no tournament_round_scoring');

select * from finish();
rollback;
