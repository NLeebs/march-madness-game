-- Re-point the stats cron jobs from Edge Functions to stats.* SQL functions.
-- cron.schedule with an existing job name replaces that job (same owner: postgres).
select cron.schedule('Add New Year Cron Job', '0 6 1 1 *', 'select stats.add_current_year()');
select cron.schedule('Calculate Global Conference Stats', '0 0 * * *', 'select stats.refresh_global_conference_stats()');
select cron.schedule('Calculate Global Team Stats', '0 */12 * * *', 'select stats.refresh_global_team_stats()');
select cron.schedule('Calculate Seed Matchup Stats', '0 0 * * *', 'select stats.refresh_seed_matchup_stats()');

-- The two per-user Edge Function jobs become one SQL job that shares a fingerprint.
select cron.unschedule(jobname) from cron.job
where jobname in ('Calculate User Bracket Stats', 'Calculate User Total Stats');
select cron.schedule('Calculate User Stats', '*/30 * * * *', 'select stats.refresh_user_stats()');
