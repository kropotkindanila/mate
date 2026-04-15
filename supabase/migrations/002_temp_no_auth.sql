-- Temporary: allow saving without a logged-in user until auth is wired up.
-- Run 003_remove_temp_no_auth.sql once auth is in place.

alter table public.bookmarks alter column user_id drop not null;

create policy "temp_anon_insert" on public.bookmarks
  for insert with check (true);

create policy "temp_anon_select" on public.bookmarks
  for select using (true);
