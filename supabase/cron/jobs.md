# Cron jobs (pg_cron)

These jobs are managed by migration `supabase/migrations/20261109211628_schedule_stats_jobs_in_sql.sql`. They call SQL functions in the private `stats` schema; they no longer call Edge Functions. The old Edge Function definitions are kept in `supabase/rollback/restore_edge_function_cron.sql` (not a migration, never auto-applied) in case a rollback is needed.

## Add New Year Cron Job

- Schedule: `0 6 1 1 *`
- Active: true

```sql
select stats.add_current_year()
```

## Calculate Global Conference Stats

- Schedule: `0 0 * * *`
- Active: true

```sql
select stats.refresh_global_conference_stats()
```

## Calculate Global Team Stats

- Schedule: `0 */12 * * *`
- Active: true

```sql
select stats.refresh_global_team_stats()
```

## Calculate Seed Matchup Stats

- Schedule: `0 0 * * *`
- Active: true

```sql
select stats.refresh_seed_matchup_stats()
```

## Calculate User Bracket Stats

- Schedule: `*/30 * * * *`
- Active: true

```sql
select stats.refresh_user_bracket_stats()
```

## Calculate User Total Stats

- Schedule: `*/30 * * * *`
- Active: true

```sql
select stats.refresh_user_total_stats()
```
