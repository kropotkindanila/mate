create table public.bookmarks (
  id          uuid                     default gen_random_uuid() primary key,
  user_id     uuid                     not null references auth.users (id) on delete cascade,
  url         text                     not null,
  title       text,
  summary     text,
  category    text,
  created_at  timestamp with time zone not null default now()
);

-- Only the owning user can read/write their bookmarks
alter table public.bookmarks enable row level security;

create policy "owner_select" on public.bookmarks
  for select using (auth.uid() = user_id);

create policy "owner_insert" on public.bookmarks
  for insert with check (auth.uid() = user_id);

create policy "owner_update" on public.bookmarks
  for update using (auth.uid() = user_id);

create policy "owner_delete" on public.bookmarks
  for delete using (auth.uid() = user_id);
