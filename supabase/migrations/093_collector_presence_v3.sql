-- Phase 25: Collector presence v3 — additive columns, event log, refresh + spotlights.
-- Auth/session WebSocket refresh is client-driven (see /api/social/presence/touch). No auth.* triggers.

alter table public.user_presence
  add column if not exists presence_state text,
  add column if not exists device_type text;

comment on column public.user_presence.presence_state is
  'Optional lamp: online | recently_active | idle — informational; client also derives from last_seen_at.';
comment on column public.user_presence.device_type is
  'web | mobile | unknown — last touch device (self-reported from client).';

-- ---------------------------------------------------------------------------
-- Append-only events (internal / service — not for public UI dumps)
-- ---------------------------------------------------------------------------

create table if not exists public.user_presence_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_presence_events_user_created_idx
  on public.user_presence_events (user_id, created_at desc);

alter table public.user_presence_events enable row level security;
revoke all on table public.user_presence_events from public;
revoke all on table public.user_presence_events from anon;
revoke all on table public.user_presence_events from authenticated;
grant insert, select on table public.user_presence_events to service_role;

-- ---------------------------------------------------------------------------
-- log_user_presence_event (service_role)
-- ---------------------------------------------------------------------------

create or replace function public.log_user_presence_event(
  p_user_id uuid,
  p_event_type text,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_event_type is null or length(trim(p_event_type)) = 0 then
    return;
  end if;
  insert into public.user_presence_events (user_id, event_type, metadata)
  values (p_user_id, trim(p_event_type), coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function public.log_user_presence_event(uuid, text, jsonb) from public;
grant execute on function public.log_user_presence_event(uuid, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- refresh_user_presence — heartbeat + optional lamp + device (maps into touch_user_presence)
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_presence(
  p_user_id uuid,
  p_state text,
  p_device text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dev text := lower(trim(coalesce(p_device, '')));
  v_st text := lower(trim(coalesce(p_state, '')));
  v_act text;
begin
  if p_user_id is null then
    return;
  end if;

  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  if v_dev not in ('web', 'mobile', 'unknown', '') then
    v_dev := 'unknown';
  end if;
  if v_dev = '' then
    v_dev := 'unknown';
  end if;

  if v_st not in ('online', 'recently_active', 'idle', '') then
    v_st := '';
  end if;

  v_act := case v_st
    when 'online' then 'browsing_sets'
    when 'idle' then null
    when 'recently_active' then null
    else null
  end;

  perform public.touch_user_presence(p_user_id, v_act);

  update public.user_presence up
  set
    device_type = case when v_dev = 'unknown' then coalesce(up.device_type, 'unknown') else v_dev end,
    presence_state = case when v_st = '' then up.presence_state else v_st end,
    updated_at = now()
  where up.user_id = p_user_id;
end;
$$;

revoke all on function public.refresh_user_presence(uuid, text, text) from public;
grant execute on function public.refresh_user_presence(uuid, text, text) to authenticated;
grant execute on function public.refresh_user_presence(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Read RPCs (existing get_user_presence / batch unchanged — add social helpers)
-- ---------------------------------------------------------------------------

create or replace function public.get_recently_active_collectors(p_limit int)
returns table (
  user_id uuid,
  spotlight_note text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_lim int := greatest(1, least(coalesce(p_limit, 24), 48));
begin
  return query
  select
    p.user_id,
    case (floor(random() * 3))::int
      when 0 then 'Recently surfaced on scans or community — welcoming collector energy.'
      when 1 then 'Light footprint in the last stretch — worth saying hello.'
      else 'Aligned collectors crossing paths in seasonal moments.'
    end::text
  from public.user_presence p
  where coalesce(p.presence_opt_out, false) = false
    and p.last_seen_at >= now() - interval '45 minutes'
  order by p.last_seen_at desc
  limit v_lim;
end;
$$;

revoke all on function public.get_recently_active_collectors(int) from public;
grant execute on function public.get_recently_active_collectors(int) to authenticated;

create or replace function public.get_presence_spotlights(p_limit int)
returns table (
  user_id uuid,
  spotlight_note text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_lim int := greatest(1, least(coalesce(p_limit, 12), 32));
begin
  return query
  select
    p.user_id,
    case (floor(random() * 4))::int
      when 0 then 'Warm presence — trainers notice steady binder and deck rhythm.'
      when 1 then 'Community-forward cadence without noise.'
      when 2 then 'Seasonally tuned collector identity.'
      else 'Quietly consistent — the hobby stays welcoming.'
    end::text
  from public.user_presence p
  where coalesce(p.presence_opt_out, false) = false
    and p.last_seen_at >= now() - interval '7 days'
  order by random()
  limit v_lim;
end;
$$;

revoke all on function public.get_presence_spotlights(int) from public;
grant execute on function public.get_presence_spotlights(int) to authenticated;

notify pgrst, 'reload schema';
