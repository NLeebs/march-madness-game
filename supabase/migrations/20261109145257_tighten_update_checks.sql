-- Updates must not move picks or brackets across years.

-- A pick may only be updated to point at the owner's own bracket and a game in
-- that bracket's year (same check as user_picks_insert_authenticated).
alter policy "user_picks_update_own" on public.user_picks
  with check (
    exists (
      select 1
      from public.user_brackets b
      join public.tournament_games g on g.year_id = b.year_id
      where b.id = user_picks.bracket_id
        and g.id = user_picks.game_id
        and b.user_id = (select auth.uid())
    )
  );

-- A bracket's year and anonymous owner are fixed after insert; authenticated
-- users keep UPDATE only on tournament_scoring_rules_id.
revoke update (year_id, anon_user_id) on public.user_brackets from authenticated;

-- Scoring rules must belong to the bracket's year.
alter policy "user_brackets_update_authenticated" on public.user_brackets
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.tournament_scoring_rules r
      where r.id = user_brackets.tournament_scoring_rules_id
        and r.year_id = user_brackets.year_id
    )
  );
