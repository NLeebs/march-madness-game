begin;
select plan(11);

select tests.clear_authentication();
create temp table fx (name text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx values
  ('user_a', tests.create_user('uu-a@test.dev')),
  ('user_b', tests.create_user('uu-b@test.dev')),
  ('y1', tests.create_year(2095)),
  ('y2', tests.create_year(2096)),
  ('round', tests.create_round('uu-round'));
insert into fx values
  ('r1', tests.create_scoring_rules((select id from fx where name = 'y1'))),
  ('r2', tests.create_scoring_rules((select id from fx where name = 'y2')));
insert into public.profiles (id, username) values
  ((select id from fx where name = 'user_a'), 'alice')
  on conflict (id) do update set username = 'alice';
insert into public.profiles (id, username) values
  ((select id from fx where name = 'user_b'), 'bob')
  on conflict (id) do update set username = 'bob';
insert into fx values
  ('g1', tests.create_game((select id from fx where name = 'y1'), (select id from fx where name = 'round'))),
  ('g2', tests.create_game((select id from fx where name = 'y1'), (select id from fx where name = 'round'))),
  ('g3', tests.create_game((select id from fx where name = 'y2'), (select id from fx where name = 'round'))),
  ('ba', tests.create_bracket((select id from fx where name = 'user_a'), (select id from fx where name = 'y1'))),
  ('ba2', tests.create_bracket((select id from fx where name = 'user_a'), (select id from fx where name = 'y2'))),
  ('bb', tests.create_bracket((select id from fx where name = 'user_b'), (select id from fx where name = 'y1')));
insert into fx values
  ('pa', gen_random_uuid()),
  ('pb', gen_random_uuid());
insert into public.user_picks (id, bracket_id, game_id) values
  ((select id from fx where name = 'pa'), (select id from fx where name = 'ba'), (select id from fx where name = 'g1')),
  ((select id from fx where name = 'pb'), (select id from fx where name = 'bb'), (select id from fx where name = 'g1'));

-- profiles: another user row is untouched; own row can be updated
select tests.authenticate_as((select id from fx where name = 'user_a'));
select lives_ok($$update public.profiles set username = 'hacked' where id = (select id from fx where name = 'user_b')$$,
  'user A update of user B profile does not error');
select tests.clear_authentication();
select is((select username from public.profiles where id = (select id from fx where name = 'user_b')), 'bob',
  'user B profile unchanged by user A');
select tests.authenticate_as((select id from fx where name = 'user_a'));
update public.profiles set username = 'alice2' where id = (select id from fx where name = 'user_a');
select tests.clear_authentication();
select is((select username from public.profiles where id = (select id from fx where name = 'user_a')), 'alice2',
  'user A can update own username');

-- brackets and picks: clients cannot update any row, own or another user (42501)
select tests.authenticate_as((select id from fx where name = 'user_a'));
select throws_ok($$update public.user_brackets set tournament_scoring_rules_id = (select id from fx where name = 'r2') where id = (select id from fx where name = 'bb')$$,
  '42501', null, 'user A cannot update user B bracket');
select throws_ok($$update public.user_picks set game_id = (select id from fx where name = 'g2') where id = (select id from fx where name = 'pb')$$,
  '42501', null, 'user A cannot update user B pick');
select throws_ok($$update public.user_brackets set tournament_scoring_rules_id = tournament_scoring_rules_id where id = (select id from fx where name = 'ba')$$,
  '42501', null, 'user A cannot update own bracket');
select throws_ok($$update public.user_brackets set year_id = (select id from fx where name = 'y2') where id = (select id from fx where name = 'ba')$$,
  '42501', null, 'user A cannot change own bracket year_id');
select throws_ok($$update public.user_picks set game_id = (select id from fx where name = 'g2') where id = (select id from fx where name = 'pa')$$,
  '42501', null, 'user A cannot update own pick');
select throws_ok($$update public.user_picks set bracket_id = (select id from fx where name = 'ba2') where id = (select id from fx where name = 'pa')$$,
  '42501', null, 'user A cannot move own pick to another bracket');
select tests.clear_authentication();

-- nothing moved
select is((select game_id from public.user_picks where id = (select id from fx where name = 'pa')), (select id from fx where name = 'g1'),
  'user A pick unchanged');
select is((select tournament_scoring_rules_id from public.user_brackets where id = (select id from fx where name = 'bb')), (select id from fx where name = 'r1'),
  'user B bracket unchanged');

select * from finish();
rollback;
