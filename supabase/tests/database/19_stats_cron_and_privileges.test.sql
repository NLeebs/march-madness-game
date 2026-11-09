begin;
select plan(4);

select results_eq(
  $$select jobname::text, schedule::text, command::text from cron.job order by jobname$$,
  $$values
    ('Add New Year Cron Job'::text, '0 6 1 1 *'::text, 'select stats.add_current_year()'::text),
    ('Calculate Global Conference Stats', '0 0 * * *', 'select stats.refresh_global_conference_stats()'),
    ('Calculate Global Team Stats', '0 */12 * * *', 'select stats.refresh_global_team_stats()'),
    ('Calculate Seed Matchup Stats', '0 0 * * *', 'select stats.refresh_seed_matchup_stats()'),
    ('Calculate User Bracket Stats', '*/30 * * * *', 'select stats.refresh_user_bracket_stats()'),
    ('Calculate User Total Stats', '*/30 * * * *', 'select stats.refresh_user_total_stats()')$$,
  'cron jobs call stats functions'
);

select is_empty(
  $$select jobname from cron.job where command like '%net.http_post%'$$,
  'no cron job calls an Edge Function'
);

select is_empty(
  $$select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    cross join unnest(array['anon','authenticated','service_role']) r
    where n.nspname = 'stats' and has_function_privilege(r, p.oid, 'execute')$$,
  'API roles cannot execute stats functions'
);

select ok(
  not exists (select 1 from unnest(array['anon','authenticated','service_role']) r
              where has_table_privilege(r, 'stats.refresh_log', 'select')),
  'API roles cannot read stats.refresh_log'
);

select * from finish();
rollback;
