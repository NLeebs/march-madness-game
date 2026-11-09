# Cron jobs (pg_cron) on the hosted project

Documentation only - not applied by any workflow. Captured read-only on 2026-11-09 from `cron.job`. The hosted project is the source of truth until these are managed by a migration.

No job sends any headers (`headers:=jsonb_build_object()`), so there is no secret to redact. Every job calls its Edge Function with no auth header, which is why the functions currently need `verify_jwt: false` (see `docs/DIAGNOSIS.md` finding 23).

## Add New Year Cron Job

- Schedule: `0 6 1 1 *`
- Active: true

```sql
select
  net.http_post(
      url:='https://mowmxsorkncjycsomqpn.supabase.co/functions/v1/inset-new-year',
      headers:=jsonb_build_object(),
      timeout_milliseconds:=1000
  );
```

## Calculate Global Conference Stats

- Schedule: `0 0 * * *`
- Active: true

```sql
select
  net.http_post(
      url:='https://mowmxsorkncjycsomqpn.supabase.co/functions/v1/calculate_global_conference_stats',
      headers:=jsonb_build_object(),
      timeout_milliseconds:=1000
  );
```

## Calculate Global Team Stats

- Schedule: `0 */12 * * *`
- Active: true

```sql
select
  net.http_post(
      url:='https://mowmxsorkncjycsomqpn.supabase.co/functions/v1/calculate_global_team_stats',
      headers:=jsonb_build_object(),
      timeout_milliseconds:=1000
  );
```

## Calculate Seed Matchup Stats

- Schedule: `0 0 * * *`
- Active: true

```sql
select
  net.http_post(
      url:='https://mowmxsorkncjycsomqpn.supabase.co/functions/v1/calculate_seed_matchup_stats',
      headers:=jsonb_build_object(),
      timeout_milliseconds:=1000
  );
```

## Calculate User Bracket Stats

- Schedule: `*/30 * * * *`
- Active: true

```sql
select
  net.http_post(
      url:='https://mowmxsorkncjycsomqpn.supabase.co/functions/v1/calculate_bracket_stats',
      headers:=jsonb_build_object(),
      timeout_milliseconds:=1000
  );
```

## Calculate User Total Stats

- Schedule: `*/30 * * * *`
- Active: true

```sql
select
  net.http_post(
      url:='https://mowmxsorkncjycsomqpn.supabase.co/functions/v1/calculate_user_total_stats',
      headers:=jsonb_build_object(),
      timeout_milliseconds:=1000
  );
```
