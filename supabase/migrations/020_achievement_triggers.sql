-- Auto-unlock achievements after binders / cards / scans (uses apply_achievement_unlock).
-- Scan table in this project is public.scan_events (not public.scans).

create or replace function public.check_and_unlock(
  user_id uuid,
  requirement_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_cnt int;
  v_rt text := lower(trim(requirement_type));
begin
  v_cnt := case v_rt
    when 'binder_count' then (
      select count(*)::int
      from public.binders b
      where b.user_id = check_and_unlock.user_id
    )
    when 'card_count' then (
      select count(*)::int
      from public.cards c
      where c.user_id = check_and_unlock.user_id
    )
    when 'scan_count' then (
      select count(*)::int
      from public.scan_events s
      where s.user_id = check_and_unlock.user_id
    )
    else 0
  end;

  for r in
    select a.slug
    from public.achievements a
    where lower(trim(a.requirement_type)) = v_rt
      and a.requirement_value <= v_cnt
  loop
    perform public.apply_achievement_unlock(check_and_unlock.user_id, r.slug);
  end loop;
end;
$$;

comment on function public.check_and_unlock(uuid, text) is
  'Trigger helper: unlock all achievements for a metric at or below the user''s current count.';

revoke all on function public.check_and_unlock(uuid, text) from public;

-- ---------------------------------------------------------------------------
-- Triggers (replace older names from 019_achievements_system if present)
-- ---------------------------------------------------------------------------

drop trigger if exists achievements_after_binder_insert on public.binders;
drop trigger if exists achievements_after_card_insert on public.cards;
drop trigger if exists achievements_after_scan_insert on public.scan_events;

create or replace function public.trg_achievement_after_binder_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_and_unlock(NEW.user_id, 'binder_count');
  return NEW;
end;
$$;

drop trigger if exists achievement_unlock_after_binder_insert on public.binders;
create trigger achievement_unlock_after_binder_insert
  after insert on public.binders
  for each row
  execute function public.trg_achievement_after_binder_insert();

create or replace function public.trg_achievement_after_card_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_and_unlock(NEW.user_id, 'card_count');
  return NEW;
end;
$$;

drop trigger if exists achievement_unlock_after_card_insert on public.cards;
create trigger achievement_unlock_after_card_insert
  after insert on public.cards
  for each row
  execute function public.trg_achievement_after_card_insert();

create or replace function public.trg_achievement_after_scan_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_and_unlock(NEW.user_id, 'scan_count');
  return NEW;
end;
$$;

drop trigger if exists achievement_unlock_after_scan_insert on public.scan_events;
create trigger achievement_unlock_after_scan_insert
  after insert on public.scan_events
  for each row
  execute function public.trg_achievement_after_scan_insert();

notify pgrst, 'reload schema';
