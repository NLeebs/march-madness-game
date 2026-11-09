-- Re-point the six stats cron jobs from Edge Functions to stats.* SQL functions.
-- cron.schedule with an existing job name replaces that job (same owner: postgres).
select cron.schedule('Add New Year Cron Job', '0 6 1 1 *', 'select stats.add_current_year()');
select cron.schedule('Calculate Global Conference Stats', '0 0 * * *', 'select stats.refresh_global_conference_stats()');
select cron.schedule('Calculate Global Team Stats', '0 */12 * * *', 'select stats.refresh_global_team_stats()');
select cron.schedule('Calculate Seed Matchup Stats', '0 0 * * *', 'select stats.refresh_seed_matchup_stats()');
select cron.schedule('Calculate User Bracket Stats', '*/30 * * * *', 'select stats.refresh_user_bracket_stats()');
select cron.schedule('Calculate User Total Stats', '*/30 * * * *', 'select stats.refresh_user_total_stats()');
