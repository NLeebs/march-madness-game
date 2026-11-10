-- Rollback: restore the Edge Function cron jobs. NOT a migration; never auto-applied.
-- Apply only with the owner's OK (e.g. as a new migration) if the SQL stats jobs misbehave.

-- The SQL setup runs both per-user refreshes from one job; the Edge Function setup had two.
select cron.unschedule(jobname) from cron.job where jobname = 'Calculate User Stats';

select cron.schedule('Add New Year Cron Job', '0 6 1 1 *', $cmd$
select
  net.http_post(
      url:='https://mowmxsorkncjycsomqpn.supabase.co/functions/v1/inset-new-year',
      headers:=jsonb_build_object(),
      timeout_milliseconds:=1000
  );
$cmd$);

select cron.schedule('Calculate Global Conference Stats', '0 0 * * *', $cmd$
select
  net.http_post(
      url:='https://mowmxsorkncjycsomqpn.supabase.co/functions/v1/calculate_global_conference_stats',
      headers:=jsonb_build_object(),
      timeout_milliseconds:=1000
  );
$cmd$);

select cron.schedule('Calculate Global Team Stats', '0 */12 * * *', $cmd$
select
  net.http_post(
      url:='https://mowmxsorkncjycsomqpn.supabase.co/functions/v1/calculate_global_team_stats',
      headers:=jsonb_build_object(),
      timeout_milliseconds:=1000
  );
$cmd$);

select cron.schedule('Calculate Seed Matchup Stats', '0 0 * * *', $cmd$
select
  net.http_post(
      url:='https://mowmxsorkncjycsomqpn.supabase.co/functions/v1/calculate_seed_matchup_stats',
      headers:=jsonb_build_object(),
      timeout_milliseconds:=1000
  );
$cmd$);

select cron.schedule('Calculate User Bracket Stats', '*/30 * * * *', $cmd$
select
  net.http_post(
      url:='https://mowmxsorkncjycsomqpn.supabase.co/functions/v1/calculate_bracket_stats',
      headers:=jsonb_build_object(),
      timeout_milliseconds:=1000
  );
$cmd$);

select cron.schedule('Calculate User Total Stats', '*/30 * * * *', $cmd$
select
  net.http_post(
      url:='https://mowmxsorkncjycsomqpn.supabase.co/functions/v1/calculate_user_total_stats',
      headers:=jsonb_build_object(),
      timeout_milliseconds:=1000
  );
$cmd$);
