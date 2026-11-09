begin;
select plan(12);

select tests.clear_authentication();
create temp table fx (name text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx values
  ('user_a', tests.create_user('ub-a@test.dev')),
  ('user_b', tests.create_user('ub-b@test.dev')),
  ('y1', tests.create_year(2097));
insert into fx values
  ('rules', tests.create_scoring_rules((select id from fx where name = 'y1')));
insert into fx values
  ('ba', tests.create_bracket((select id from fx where name = 'user_a'), (select id from fx where name = 'y1'))),
  ('bb', tests.create_bracket((select id from fx where name = 'user_b'), (select id from fx where name = 'y1')));

-- characterization: reads, owner-scoped inserts and deletes already behave
select tests.authenticate_as((select id from fx where name = 'user_a'));
select is((select count(*) from public.user_brackets where user_id = (select id from fx where name = 'user_b')), 0::bigint,
  'user A cannot see user B brackets');
select throws_ok($$insert into public.user_brackets (user_id, year_id, tournament_scoring_rules_id) values ((select id from fx where name = 'user_b'), (select id from fx where name = 'y1'), (select id from fx where name = 'rules'))$$,
  '42501', null, 'user A cannot insert a bracket owned by user B');
delete from public.user_brackets where id = (select id from fx where name = 'bb');
select tests.clear_authentication();
select is((select count(*) from public.user_brackets where id = (select id from fx where name = 'bb')), 1::bigint,
  'user A delete did not remove user B bracket');

select tests.authenticate_as_anon();
select throws_ok($$insert into public.user_brackets (user_id, year_id, tournament_scoring_rules_id) values ((select id from fx where name = 'user_a'), (select id from fx where name = 'y1'), (select id from fx where name = 'rules'))$$,
  '42501', null, 'anon cannot insert a bracket owned by a user');

-- must keep working (no RETURNING for anon: it has no select policy)
select lives_ok($$insert into public.user_brackets (anon_user_id, year_id, tournament_scoring_rules_id) values (gen_random_uuid(), (select id from fx where name = 'y1'), (select id from fx where name = 'rules'))$$,
  'anon can insert an anonymous bracket without a score');
select tests.authenticate_as((select id from fx where name = 'user_a'));
select lives_ok($$insert into public.user_brackets (user_id, year_id, tournament_scoring_rules_id) values ((select id from fx where name = 'user_a'), (select id from fx where name = 'y1'), (select id from fx where name = 'rules'))$$,
  'user A can insert own bracket without a score');
select is((select max(score) from public.user_brackets where user_id = (select id from fx where name = 'user_a')), 0,
  'bracket inserted without a score defaults to 0');

-- failing until fixed
select throws_ok($$insert into public.user_brackets (user_id, year_id, tournament_scoring_rules_id, score) values ((select id from fx where name = 'user_a'), (select id from fx where name = 'y1'), (select id from fx where name = 'rules'), 999)$$,
  '42501', null, 'user A cannot insert a bracket with a score');
select throws_ok($$update public.user_brackets set score = 999 where id = (select id from fx where name = 'ba')$$,
  '42501', null, 'user A cannot update own bracket score');
select tests.authenticate_as_anon();
select throws_ok($$insert into public.user_brackets (anon_user_id, year_id, tournament_scoring_rules_id, score) values (gen_random_uuid(), (select id from fx where name = 'y1'), (select id from fx where name = 'rules'), 999)$$,
  '42501', null, 'anon cannot insert a bracket with a score');

-- service_role keeps full write access
select tests.authenticate_as_service_role();
select lives_ok($$update public.user_brackets set score = 50 where id = (select id from fx where name = 'bb')$$,
  'service_role can update a bracket score');
select is((select score from public.user_brackets where id = (select id from fx where name = 'bb')), 50,
  'service_role score update took effect');

select * from finish();
rollback;
