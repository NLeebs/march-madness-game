begin;
select plan(10);

select tests.clear_authentication();
create temp table fx (name text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx values
  ('user_a', tests.create_user('up-a@test.dev')),
  ('user_b', tests.create_user('up-b@test.dev')),
  ('y1', tests.create_year(2098)),
  ('y2', tests.create_year(2099)),
  ('round', tests.create_round('up-round'));
select tests.create_scoring_rules((select id from fx where name = 'y1'));
select tests.create_scoring_rules((select id from fx where name = 'y2'));
insert into fx values
  ('g1', tests.create_game((select id from fx where name = 'y1'), (select id from fx where name = 'round'))),
  ('g2', tests.create_game((select id from fx where name = 'y1'), (select id from fx where name = 'round'))),
  ('g4', tests.create_game((select id from fx where name = 'y1'), (select id from fx where name = 'round'))),
  ('g3', tests.create_game((select id from fx where name = 'y2'), (select id from fx where name = 'round'))),
  ('ba', tests.create_bracket((select id from fx where name = 'user_a'), (select id from fx where name = 'y1'))),
  ('bb', tests.create_bracket((select id from fx where name = 'user_b'), (select id from fx where name = 'y1'))),
  ('bn', tests.create_anon_bracket(gen_random_uuid(), (select id from fx where name = 'y1')));
insert into public.user_picks (bracket_id, game_id)
  values ((select id from fx where name = 'bb'), (select id from fx where name = 'g1'));

-- reads stay scoped to own brackets; clients cannot write picks at all (only the server does)
select tests.authenticate_as((select id from fx where name = 'user_a'));
select is((select count(*) from public.user_picks where bracket_id = (select id from fx where name = 'bb')), 0::bigint,
  'user A cannot see user B picks');
select throws_ok($$delete from public.user_picks where bracket_id = (select id from fx where name = 'bb')$$,
  '42501', null, 'user A cannot delete picks');
select tests.clear_authentication();
select is((select count(*) from public.user_picks where bracket_id = (select id from fx where name = 'bb')), 1::bigint,
  'user B pick still exists after the denied delete');
select ok(
  not (has_table_privilege('anon', 'public.user_picks', 'TRUNCATE')
    or has_table_privilege('authenticated', 'public.user_picks', 'TRUNCATE')
    or has_table_privilege('anon', 'public.user_picks', 'INSERT')
    or has_table_privilege('authenticated', 'public.user_picks', 'INSERT')
    or has_table_privilege('anon', 'public.user_picks', 'UPDATE')
    or has_table_privilege('authenticated', 'public.user_picks', 'UPDATE')
    or has_table_privilege('anon', 'public.user_picks', 'DELETE')
    or has_table_privilege('authenticated', 'public.user_picks', 'DELETE')),
  'clients hold no insert, update, delete or truncate privilege on user_picks');

select tests.authenticate_as_anon();
select throws_ok($$insert into public.user_picks (bracket_id, game_id) values ((select id from fx where name = 'ba'), (select id from fx where name = 'g1'))$$,
  '42501', null, 'anon cannot insert a pick');

-- client inserts are denied outright
select tests.authenticate_as((select id from fx where name = 'user_a'));
select throws_ok($$insert into public.user_picks (bracket_id, game_id) values ((select id from fx where name = 'bb'), (select id from fx where name = 'g2'))$$,
  '42501', null, 'user A cannot insert a pick into user B bracket');
select throws_ok($$insert into public.user_picks (bracket_id, game_id) values ((select id from fx where name = 'ba'), (select id from fx where name = 'g3'))$$,
  '42501', null, 'user A cannot insert a pick for a game in another year');
select throws_ok($$insert into public.user_picks (bracket_id, game_id) values ((select id from fx where name = 'bn'), (select id from fx where name = 'g2'))$$,
  '42501', null, 'user A cannot insert a pick into an anonymous bracket');
select throws_ok($$insert into public.user_picks (bracket_id, game_id) values ((select id from fx where name = 'ba'), (select id from fx where name = 'g1'))$$,
  '42501', null, 'user A cannot insert a pick into own bracket');

-- the server keeps working
select tests.authenticate_as_service_role();
select lives_ok($$insert into public.user_picks (bracket_id, game_id) values ((select id from fx where name = 'bb'), (select id from fx where name = 'g4'))$$,
  'service_role can insert a pick into any bracket');

select * from finish();
rollback;
