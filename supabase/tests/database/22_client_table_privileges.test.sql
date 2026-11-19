begin;
select plan(8);

-- TRUNCATE skips RLS, so no client role may truncate any public table,
-- now or after a later migration adds one.
select is((select count(*) from pg_tables t, (values ('anon'), ('authenticated')) r (role)
           where t.schemaname = 'public'
             and has_table_privilege(r.role, format('public.%I', t.tablename), 'TRUNCATE')), 0::bigint,
  'anon and authenticated cannot truncate any public table');
create table public.zz_privileges_probe (id int);
select is(has_table_privilege('anon', 'public.zz_privileges_probe', 'TRUNCATE'), false,
  'anon cannot truncate a table created later');
select is(has_table_privilege('authenticated', 'public.zz_privileges_probe', 'TRUNCATE'), false,
  'authenticated cannot truncate a table created later');

-- tournament_games.bracket_id would let clients group every bracket's games,
-- so clients may read every column but that one.
select is(has_column_privilege('anon', 'public.tournament_games', 'bracket_id', 'SELECT')
          or has_column_privilege('authenticated', 'public.tournament_games', 'bracket_id', 'SELECT'), false,
  'clients cannot read tournament_games.bracket_id');
select is((select count(*) from information_schema.columns c, (values ('anon'), ('authenticated')) r (role)
           where c.table_schema = 'public' and c.table_name = 'tournament_games' and c.column_name <> 'bracket_id'
             and not has_column_privilege(r.role, 'public.tournament_games', c.column_name, 'SELECT')), 0::bigint,
  'clients can read every other tournament_games column');
select is(has_column_privilege('service_role', 'public.tournament_games', 'bracket_id', 'SELECT'), true,
  'service_role can read tournament_games.bracket_id');

select tests.authenticate_as_anon();
select throws_ok($$select bracket_id from public.tournament_games$$, '42501', null, 'anon selecting bracket_id is denied');
select lives_ok($$select id, round_id, winning_team_id from public.tournament_games$$, 'anon can still select the other columns');

select * from finish();
rollback;
