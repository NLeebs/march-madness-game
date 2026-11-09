begin;
select plan(8);

select tests.clear_authentication();
create temp table fx (name text primary key, id uuid);
grant all on fx to anon, authenticated;
insert into fx values
  ('user_a', tests.create_user('prof-a@test.dev')),
  ('user_b', tests.create_user('prof-b@test.dev')),
  ('user_c', tests.create_user('prof-c@test.dev'));
insert into public.profiles (id, username)
  values ((select id from fx where name = 'user_b'), 'bob');

-- useFieldAvailability: anon checks whether a username is taken
select tests.authenticate_as_anon();
select is((select count(*) from public.profiles where username = 'bob'), 1::bigint, 'anon sees existing username');
select is((select count(*) from public.profiles where username = 'nobody'), 0::bigint, 'anon sees unused username as available');

-- useSignUp: newly signed-in user inserts own profile
select tests.authenticate_as((select id from fx where name = 'user_a'));
select lives_ok($$insert into public.profiles (id, username) values ((select id from fx where name = 'user_a'), 'alice')$$,
  'user can insert own profile');
select is((select username from public.profiles where id = (select id from fx where name = 'user_a')), 'alice', 'user reads back own profile');
select throws_ok($$insert into public.profiles (id, username) values ((select id from fx where name = 'user_c'), 'mallory')$$,
  '42501', null, 'user cannot insert a profile for another user');

select tests.authenticate_as_anon();
select throws_ok($$insert into public.profiles (id, username) values ((select id from fx where name = 'user_c'), 'anon-mallory')$$,
  '42501', null, 'anon cannot insert a profile');

-- profiles_delete_own
select tests.authenticate_as((select id from fx where name = 'user_a'));
delete from public.profiles where id = (select id from fx where name = 'user_b');
select tests.clear_authentication();
select is((select count(*) from public.profiles where id = (select id from fx where name = 'user_b')), 1::bigint, 'user cannot delete another user''s profile');

select tests.authenticate_as((select id from fx where name = 'user_a'));
delete from public.profiles where id = (select id from fx where name = 'user_a');
select tests.clear_authentication();
select is((select count(*) from public.profiles where id = (select id from fx where name = 'user_a')), 0::bigint, 'user can delete own profile');

select * from finish();
rollback;
