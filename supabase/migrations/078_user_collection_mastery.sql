-- Binder mastery + master-set completion. Thresholds and keys MUST match:
--   src/lib/collection/binder-mastery-catalog.ts
--   src/lib/collection/set-completion-catalog.ts
--
-- "Complete binder": at least one binder_slots row exists for the binder and every slot has card_id set.
-- "Complete set": for a catalog set_id, count(distinct user cards' catalog_card_id) >= count(catalog_cards in set).

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.user_collection_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mastery_type text not null check (mastery_type in ('binder', 'set')),
  mastery_key text not null,
  completed_count int not null default 0,
  is_complete boolean not null default false,
  completed_at timestamptz,
  constraint user_collection_mastery_user_type_key unique (user_id, mastery_type, mastery_key)
);

create index if not exists user_collection_mastery_user_id_idx
  on public.user_collection_mastery (user_id);

comment on table public.user_collection_mastery is
  'Collection mastery progress (full binders + master sets); maintained by refresh_user_collection_mastery.';

alter table public.user_collection_mastery enable row level security;

drop policy if exists "user_collection_mastery_select_authenticated" on public.user_collection_mastery;
create policy "user_collection_mastery_select_authenticated"
  on public.user_collection_mastery
  for select
  to authenticated
  using (true);

grant select on table public.user_collection_mastery to authenticated;

-- ---------------------------------------------------------------------------
-- Internal merge + optional first-completion badge (collection_mastery)
-- ---------------------------------------------------------------------------

create or replace function public._collection_mastery_merge_row(
  p_user_id uuid,
  p_mastery_type text,
  p_mastery_key text,
  p_completed_count int,
  p_threshold int,
  p_badge_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old boolean;
  v_complete boolean;
begin
  if p_user_id is null or p_mastery_type is null or length(trim(p_mastery_type)) = 0
     or p_mastery_key is null or length(trim(p_mastery_key)) = 0 or p_threshold is null or p_threshold <= 0 then
    return;
  end if;

  v_complete := p_completed_count >= p_threshold;

  select u.is_complete into v_old
  from public.user_collection_mastery u
  where u.user_id = p_user_id
    and u.mastery_type = trim(p_mastery_type)
    and u.mastery_key = trim(p_mastery_key);

  insert into public.user_collection_mastery (
    id,
    user_id,
    mastery_type,
    mastery_key,
    completed_count,
    is_complete,
    completed_at
  )
  values (
    gen_random_uuid(),
    p_user_id,
    trim(p_mastery_type),
    trim(p_mastery_key),
    greatest(0, p_completed_count),
    v_complete,
    case when v_complete then now() else null end
  )
  on conflict (user_id, mastery_type, mastery_key) do update set
    completed_count = excluded.completed_count,
    is_complete = excluded.is_complete,
    completed_at = coalesce(public.user_collection_mastery.completed_at, excluded.completed_at);

  if v_complete and coalesce(v_old, false) = false
     and p_badge_key is not null and length(trim(p_badge_key)) > 0 then
    insert into public.user_badges (user_id, badge_type, badge_key, earned_at)
    values (p_user_id, 'collection_mastery', trim(p_badge_key), now())
    on conflict (user_id, badge_type, badge_key) do nothing;
  end if;
end;
$$;

revoke all on function public._collection_mastery_merge_row(uuid, text, text, int, int, text) from public;

-- ---------------------------------------------------------------------------
-- refresh_user_collection_mastery
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_collection_mastery(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_binders int;
  v_sets int;
begin
  if p_user_id is null then
    return;
  end if;

  select coalesce(count(*)::int, 0) into v_binders
  from public.binders b
  where b.user_id = p_user_id
    and exists (select 1 from public.binder_slots bs where bs.binder_id = b.id)
    and not exists (
      select 1 from public.binder_slots bs2
      where bs2.binder_id = b.id and bs2.card_id is null
    );

  select coalesce(count(*)::int, 0) into v_sets
  from (
    select us.set_id
    from (
      select cc.set_id, count(distinct c.catalog_card_id)::bigint as owned
      from public.cards c
      inner join public.catalog_cards cc on cc.id = c.catalog_card_id
      where c.user_id = p_user_id
        and c.catalog_card_id is not null
      group by cc.set_id
    ) us
    inner join (
      select cc2.set_id, count(*)::bigint as need
      from public.catalog_cards cc2
      group by cc2.set_id
    ) st on st.set_id = us.set_id
    where us.owned >= st.need and st.need > 0
  ) subq;

  perform public._collection_mastery_merge_row(
    p_user_id, 'binder', 'first_binder_complete', v_binders, 1, 'cm_binder_first'
  );
  perform public._collection_mastery_merge_row(
    p_user_id, 'binder', 'three_binders_complete', v_binders, 3, 'cm_binder_three'
  );
  perform public._collection_mastery_merge_row(
    p_user_id, 'binder', 'ten_binders_complete', v_binders, 10, 'cm_binder_ten'
  );

  perform public._collection_mastery_merge_row(
    p_user_id, 'set', 'first_set_complete', v_sets, 1, 'cm_set_first'
  );
  perform public._collection_mastery_merge_row(
    p_user_id, 'set', 'five_sets_complete', v_sets, 5, 'cm_set_five'
  );
  perform public._collection_mastery_merge_row(
    p_user_id, 'set', 'ten_sets_complete', v_sets, 10, 'cm_set_ten'
  );
end;
$$;

revoke all on function public.refresh_user_collection_mastery(uuid) from public;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_user_collection_mastery(p_user_id uuid)
returns table (
  mastery_type text,
  mastery_key text,
  completed_count int,
  is_complete boolean,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.mastery_type,
    u.mastery_key,
    u.completed_count,
    u.is_complete,
    u.completed_at
  from public.user_collection_mastery u
  where u.user_id = p_user_id
  order by u.mastery_type asc, u.mastery_key asc;
$$;

revoke all on function public.get_user_collection_mastery(uuid) from public;
grant execute on function public.get_user_collection_mastery(uuid) to authenticated;

create or replace function public.get_users_collection_mastery_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  mastery_type text,
  mastery_key text,
  completed_count int,
  is_complete boolean,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.user_id,
    u.mastery_type,
    u.mastery_key,
    u.completed_count,
    u.is_complete,
    u.completed_at
  from public.user_collection_mastery u
  where u.user_id = any(p_user_ids);
$$;

revoke all on function public.get_users_collection_mastery_batch(uuid[]) from public;
grant execute on function public.get_users_collection_mastery_batch(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.trg_collection_mastery_from_binder_slot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  bid uuid;
begin
  if tg_op = 'DELETE' then
    bid := old.binder_id;
  else
    bid := new.binder_id;
  end if;
  select b.user_id into uid from public.binders b where b.id = bid;
  if uid is not null then
    perform public.refresh_user_collection_mastery(uid);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.trg_collection_mastery_from_binder_slot() from public;

create or replace function public.trg_collection_mastery_from_cards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if tg_op = 'DELETE' then
    uid := old.user_id;
  else
    uid := new.user_id;
  end if;
  if uid is not null then
    perform public.refresh_user_collection_mastery(uid);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.trg_collection_mastery_from_cards() from public;

create or replace function public.trg_collection_mastery_from_binders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.refresh_user_collection_mastery(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_collection_mastery_from_binders() from public;

drop trigger if exists user_collection_mastery_binder_slots_aiud on public.binder_slots;
create trigger user_collection_mastery_binder_slots_aiud
  after insert or delete or update of card_id on public.binder_slots
  for each row
  execute function public.trg_collection_mastery_from_binder_slot();

drop trigger if exists user_collection_mastery_cards_aiud on public.cards;
create trigger user_collection_mastery_cards_aiud
  after insert or delete or update of catalog_card_id, binder_id on public.cards
  for each row
  execute function public.trg_collection_mastery_from_cards();

drop trigger if exists user_collection_mastery_binders_aiu on public.binders;
create trigger user_collection_mastery_binders_aiu
  after insert or update of name, description on public.binders
  for each row
  execute function public.trg_collection_mastery_from_binders();

-- ---------------------------------------------------------------------------
-- get_user_badges: insert collection_mastery after journey
-- ---------------------------------------------------------------------------

create or replace function public.get_user_badges(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  badge_type text,
  badge_key text,
  earned_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.user_id, b.badge_type, b.badge_key, b.earned_at
  from public.user_badges b
  where b.user_id = p_user_id
  order by
    case b.badge_type
      when 'tier' then 0
      when 'tenure' then 1
      when 'scan_milestone' then 2
      when 'seasonal_event' then 3
      when 'journey' then 4
      when 'collection_mastery' then 5
      else 6
    end,
    case b.badge_type
      when 'scan_milestone' then
        case b.badge_key
          when 'scans_5000' then 5000
          when 'scans_1000' then 1000
          when 'scans_500' then 500
          when 'scans_100' then 100
          else 0
        end
      when 'seasonal_event' then
        case b.badge_key
          when 'holiday_2026_collector' then 3
          when 'summer_2026_scan_sprint' then 2
          when 'spring_2026_collector' then 1
          else 0
        end
      when 'journey' then
        case b.badge_key
          when 'journey_rep_1000' then 7
          when 'journey_first_seasonal' then 6
          when 'journey_ten_sets' then 5
          when 'journey_first_binder' then 4
          when 'journey_scan_500' then 3
          when 'journey_scan_50' then 2
          else 0
        end
      when 'collection_mastery' then
        case b.badge_key
          when 'cm_set_ten' then 12
          when 'cm_set_five' then 11
          when 'cm_set_first' then 10
          when 'cm_binder_ten' then 3
          when 'cm_binder_three' then 2
          when 'cm_binder_first' then 1
          else 0
        end
      else 0
    end desc,
    b.earned_at asc;
$$;

revoke all on function public.get_user_badges(uuid) from public;
grant execute on function public.get_user_badges(uuid) to authenticated;

notify pgrst, 'reload schema';
