create table public.bookmark_folders (
  bookmark_id uuid not null references public.bookmarks(id) on delete cascade,
  folder_id   uuid not null references public.folders(id) on delete cascade,
  primary key (bookmark_id, folder_id)
);

alter table public.bookmark_folders enable row level security;

create policy "owner_select" on public.bookmark_folders
  for select using (
    exists (select 1 from public.bookmarks where id = bookmark_id and user_id = auth.uid())
  );

create policy "owner_insert" on public.bookmark_folders
  for insert with check (
    exists (select 1 from public.bookmarks where id = bookmark_id and user_id = auth.uid())
  );

create policy "owner_delete" on public.bookmark_folders
  for delete using (
    exists (select 1 from public.bookmarks where id = bookmark_id and user_id = auth.uid())
  );

-- Migrate existing single folder_id assignments into the junction table
insert into public.bookmark_folders (bookmark_id, folder_id)
select id, folder_id from public.bookmarks where folder_id is not null;
