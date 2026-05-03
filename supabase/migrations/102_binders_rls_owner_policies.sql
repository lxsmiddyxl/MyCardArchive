-- Binders: owner-scoped RLS (live DB may drift from repo; this migration resets policies safely).
-- Expressions: auth.uid() = user_id for all operations; role authenticated.
--
-- Diagnostics (SQL editor):
-- select user_id, count(*)::int from public.binders group by user_id;
-- select b.*, p.id as profile_exists
-- from public.binders b
-- left join public.profiles p on p.id = b.user_id;

alter table public.binders enable row level security;

-- Drop every existing RLS policy on public.binders (handles legacy names and dashboard drift).
do $$
declare
  r record;
begin
  for r in (
    select pol.polname
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relname = 'binders'
  )
  loop
    execute format('drop policy if exists %I on public.binders', r.polname);
  end loop;
end $$;

-- Explicit drops keep older Postgres / tooling paths predictable (no-op if already removed).
drop policy if exists "binders_select_own" on public.binders;
drop policy if exists "binders_insert_own" on public.binders;
drop policy if exists "binders_update_own" on public.binders;
drop policy if exists "binders_delete_own" on public.binders;
drop policy if exists "Users can read their own binders" on public.binders;
drop policy if exists "Users can create their own binders" on public.binders;
drop policy if exists "Users can update their own binders" on public.binders;
drop policy if exists "Users can delete their own binders" on public.binders;

create policy "Users can read their own binders"
  on public.binders
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own binders"
  on public.binders
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own binders"
  on public.binders
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own binders"
  on public.binders
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.binders to authenticated;
