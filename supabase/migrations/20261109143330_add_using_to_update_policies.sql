-- The baseline update policies have WITH CHECK but no USING, so no existing
-- row is visible to UPDATE and owners could not update their own rows.
-- Add ownership USING clauses matching each WITH CHECK expression.
alter policy "profiles_update_own" on public.profiles
  using (id = (select auth.uid()));

alter policy "user_brackets_update_authenticated" on public.user_brackets
  using (user_id = (select auth.uid()));

alter policy "user_picks_update_own" on public.user_picks
  using (bracket_id in (
    select id from public.user_brackets where user_id = (select auth.uid())
  ));
