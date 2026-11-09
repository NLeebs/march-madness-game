-- Authenticated users may only insert picks into their own bracket, for a game in that bracket's year.
drop policy if exists "user_picks_insert_authenticated" on public.user_picks;

create policy "user_picks_insert_authenticated" on public.user_picks
  for insert to authenticated
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
