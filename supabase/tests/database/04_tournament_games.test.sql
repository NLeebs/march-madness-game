begin;
select plan(10);

select tests.clear_authentication();
create temp table fx (name text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx values
  ('user_a', tests.create_user('tg-a@test.dev')),
  ('year', tests.create_year(2099)),
  ('round', tests.create_round('tg-round'));
insert into fx values
  ('game', tests.create_game((select id from fx where name = 'year'), (select id from fx where name = 'round')));

-- authenticated users must not write tournament_games
select tests.authenticate_as((select id from fx where name = 'user_a'));
select throws_ok($$insert into public.tournament_games (year_id, round_id) values ((select id from fx where name = 'year'), (select id from fx where name = 'round'))$$,
  '42501', null, 'authenticated user cannot insert a game');
select throws_ok($$update public.tournament_games set winning_team_id = null where id = (select id from fx where name = 'game')$$,
  '42501', null, 'authenticated user cannot update a game');
select throws_ok($$delete from public.tournament_games where id = (select id from fx where name = 'game')$$,
  '42501', null, 'authenticated user cannot delete a game');

-- anon must not write either
select tests.authenticate_as_anon();
select throws_ok($$insert into public.tournament_games (year_id, round_id) values ((select id from fx where name = 'year'), (select id from fx where name = 'round'))$$,
  '42501', null, 'anon cannot insert a game');
select throws_ok($$update public.tournament_games set winning_team_id = null where id = (select id from fx where name = 'game')$$,
  '42501', null, 'anon cannot update a game');
select throws_ok($$delete from public.tournament_games where id = (select id from fx where name = 'game')$$,
  '42501', null, 'anon cannot delete a game');

-- reads stay public
select is((select count(*) from public.tournament_games where id = (select id from fx where name = 'game')), 1::bigint, 'anon can read the game');
select tests.authenticate_as((select id from fx where name = 'user_a'));
select is((select count(*) from public.tournament_games where id = (select id from fx where name = 'game')), 1::bigint, 'authenticated user can read the game');

-- service_role keeps write access
select tests.authenticate_as_service_role();
select lives_ok($$insert into public.tournament_games (year_id, round_id) values ((select id from fx where name = 'year'), (select id from fx where name = 'round'))$$,
  'service_role can insert a game');
select lives_ok($$update public.tournament_games set favored_team_score = 70, underdog_team_score = 60 where id = (select id from fx where name = 'game')$$,
  'service_role can update a game');

select * from finish();
rollback;
