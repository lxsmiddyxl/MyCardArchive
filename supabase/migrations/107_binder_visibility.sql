-- Binder Upgrade Arc Phase 3: visibility (private | unlisted | public) + public read policies.

alter table public.binders
  add column if not exists visibility text not null default 'private';

alter table public.binders
  drop constraint if exists binders_visibility_check;

alter table public.binders
  add constraint binders_visibility_check
  check (visibility in ('private', 'unlisted', 'public'));

create index if not exists binders_visibility_public_idx
  on public.binders (visibility, updated_at desc)
  where visibility = 'public';

-- Owner policies remain from 102; add shareable read paths.
drop policy if exists "binders_select_shared" on public.binders;
create policy "binders_select_shared"
  on public.binders
  for select
  to anon, authenticated
  using (visibility in ('unlisted', 'public'));

grant select on table public.binders to anon;

drop policy if exists "binder_slots_select_shared" on public.binder_slots;
create policy "binder_slots_select_shared"
  on public.binder_slots
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.binders b
      where b.id = binder_slots.binder_id
        and b.visibility in ('unlisted', 'public')
    )
  );

grant select on table public.binder_slots to anon;

drop policy if exists "cards_select_via_shared_binder" on public.cards;
create policy "cards_select_via_shared_binder"
  on public.cards
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.binder_slots bs
      join public.binders b on b.id = bs.binder_id
      where bs.card_id = cards.id
        and b.visibility in ('unlisted', 'public')
    )
  );

create or replace function public.get_public_binder_gate(p_binder_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not exists (select 1 from public.binders b where b.id = p_binder_id) then
      jsonb_build_object('status', 'not_found')
    when not exists (
      select 1
      from public.binders b
      where b.id = p_binder_id
        and b.visibility in ('unlisted', 'public')
    ) then
      jsonb_build_object('status', 'forbidden')
    else
      jsonb_build_object('status', 'ok', 'visibility', (
        select b.visibility from public.binders b where b.id = p_binder_id limit 1
      ))
  end;
$$;

grant execute on function public.get_public_binder_gate(uuid) to anon, authenticated;

create or replace function public.get_public_binder_owner_display(p_binder_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_handle text;
  v_display text;
  v_username text;
begin
  if not exists (
    select 1 from public.binders b
    where b.id = p_binder_id and b.visibility in ('unlisted', 'public')
  ) then
    return null;
  end if;

  select p.handle, p.display_name, p.username
  into v_handle, v_display, v_username
  from public.binders b
  join public.profiles p on p.id = b.user_id
  where b.id = p_binder_id
  limit 1;

  if v_display is not null and length(trim(v_display)) > 0 then
    return trim(v_display);
  end if;
  if v_handle is not null and length(trim(v_handle)) > 0 then
    return '@' || trim(v_handle);
  end if;
  if v_username is not null and length(trim(v_username)) > 0 then
    return trim(v_username);
  end if;
  return 'Collector';
end;
$$;

grant execute on function public.get_public_binder_owner_display(uuid) to anon, authenticated;
