-- Remove temporary anonymous access and restore proper auth constraints.
-- Apply after magic link auth is wired up in the application.

-- Drop temporary open policies
drop policy if exists "temp_anon_insert" on public.bookmarks;
drop policy if exists "temp_anon_select" on public.bookmarks;

-- Restore NOT NULL constraint so every bookmark must belong to a user
alter table public.bookmarks alter column user_id set not null;
