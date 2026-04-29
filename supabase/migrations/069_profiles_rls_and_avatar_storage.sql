-- Reset public.profiles RLS (dashboard drift) and define avatars bucket + storage.objects policies.
-- Upload path: "<user_uuid>/avatar.jpg" (see src/lib/storage/avatar-upload.ts).

-- ---------------------------------------------------------------------------
-- public.profiles — drop all RLS policies, then canonical four (authenticated)
-- ---------------------------------------------------------------------------
do $$
declare
  pol text;
begin
  for pol in
    select p.polname::text
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', pol);
  end loop;
end $$;

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = id);

grant select, insert, update, delete on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- storage.buckets — avatars (public read for getPublicUrl in <img>)
-- ---------------------------------------------------------------------------
insert into storage.buckets as b (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/*']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/*']::text[];

-- ---------------------------------------------------------------------------
-- storage.objects — avatars bucket (path first segment = auth user id)
-- ---------------------------------------------------------------------------
drop policy if exists "mca_avatars_select_public" on storage.objects;
drop policy if exists "mca_avatars_insert_own_folder" on storage.objects;
drop policy if exists "mca_avatars_update_own_folder" on storage.objects;
drop policy if exists "mca_avatars_delete_own_folder" on storage.objects;
drop policy if exists "mca_avatars_select" on storage.objects;
drop policy if exists "mca_avatars_insert" on storage.objects;
drop policy if exists "mca_avatars_update" on storage.objects;
drop policy if exists "mca_avatars_delete" on storage.objects;

create policy "mca_avatars_select"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "mca_avatars_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "mca_avatars_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "mca_avatars_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );
