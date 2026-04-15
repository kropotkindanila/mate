create table public.folders (
  id         uuid                     default gen_random_uuid() primary key,
  user_id    uuid                     not null references auth.users (id) on delete cascade,
  name       text                     not null,
  created_at timestamp with time zone not null default now(),
  unique (user_id, name)
);

alter table public.folders enable row level security;

create policy "owner_select" on public.folders
  for select using (auth.uid() = user_id);

create policy "owner_insert" on public.folders
  for insert with check (auth.uid() = user_id);

create policy "owner_update" on public.folders
  for update using (auth.uid() = user_id);

create policy "owner_delete" on public.folders
  for delete using (auth.uid() = user_id);

-- Link bookmarks to folders (null = Inbox / unsorted)
alter table public.bookmarks
  add column folder_id uuid references public.folders (id) on delete set null;
