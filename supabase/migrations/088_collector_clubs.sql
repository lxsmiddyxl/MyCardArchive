-- Collector clubs: cohort tags from public identity signals (non-exclusive, auto-assigned).
-- Catalog alignment: src/lib/clubs/club-catalog.ts

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.user_clubs (
  user_id uuid not null references public.profiles (id) on delete cascade,
  club_id text not null,
  assigned_at timestamptz not null default now(),
  constraint user_clubs_pkey primary key (user_id, club_id)
);

create index if not exists user_clubs_club_id_idx on public.user_clubs (club_id, assigned_at desc);

comment on table public.user_clubs is
  'Auto-assigned collector cohort tags; maintained by refresh_user_clubs (no manual join/leave).';

alter table public.user_clubs enable row level security;

drop policy if exists "user_clubs_select_authenticated" on public.user_clubs;
create policy "user_clubs_select_authenticated"
  on public.user_clubs for select to authenticated using (true);

revoke insert, update, delete on table public.user_clubs from authenticated;
grant select on table public.user_clubs to authenticated;
grant all on table public.user_clubs to service_role;

-- ---------------------------------------------------------------------------
-- refresh_user_clubs (idempotent)
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_clubs(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fmt text;
  v_era text;
  v_artist text;
  v_char text;
  v_val bigint;
  v_binder_complete int;
  v_trade_total int;
  v_trade_pos int;
  v_seasonal int;
  v_has_participation boolean;
  v_trusted_badge boolean;
  eligible text[] := array[]::text[];
  v_ratio numeric;
begin
  if p_user_id is null then
    return;
  end if;

  select p.favorite_format_id, f.favorite_era_id, f.favorite_artist_id, f.favorite_character_id
  into v_fmt, v_era, v_artist, v_char
  from public.profiles pr
  left join public.user_play_identity p on p.user_id = pr.id
  left join public.user_fandom_identity f on f.user_id = pr.id
  where pr.id = p_user_id;

  select coalesce(c.estimated_value_cents, 0)::bigint into v_val
  from (select p_user_id as uid) x
  left join public.user_collection_value_cache c on c.user_id = x.uid;

  select coalesce(count(*)::int, 0) into v_binder_complete
  from public.user_collection_mastery m
  where m.user_id = p_user_id
    and m.mastery_type = 'binder'
    and m.is_complete = true;

  select
    coalesce(r.completed_trades_count, 0)::int,
    coalesce(r.positive_feedback_count, 0)::int
  into v_trade_total, v_trade_pos
  from (select p_user_id as uid) x
  left join public.user_trade_reputation r on r.user_id = x.uid;

  select coalesce(count(*)::int, 0) into v_seasonal
  from public.user_badges b
  where b.user_id = p_user_id
    and b.badge_type = 'seasonal_event';

  select exists (
    select 1 from public.seasonal_event_participation s
    where s.user_id = p_user_id
  ) into v_has_participation;

  select exists (
    select 1 from public.user_badges b2
    where b2.user_id = p_user_id
      and b2.badge_type = 'trade_reputation'
      and b2.badge_key = 'trusted_trader'
  ) into v_trusted_badge;

  if lower(trim(coalesce(v_fmt, ''))) = 'commander' then
    eligible := eligible || 'commander_club';
  end if;

  if lower(trim(coalesce(v_era, ''))) = 'ex_series'
     or lower(trim(coalesce(v_char, ''))) = 'charizard_line' then
    eligible := eligible || 'ex_era_dragons';
  end if;

  if coalesce(v_binder_complete, 0) >= 3 then
    eligible := eligible || 'binder_completionists';
  end if;

  v_ratio := case
    when coalesce(v_trade_total, 0) > 0 then v_trade_pos::numeric / v_trade_total::numeric
    else 0::numeric
  end;

  if coalesce(v_trusted_badge, false) = true
     or (coalesce(v_trade_total, 0) >= 10 and v_ratio >= 0.85) then
    eligible := eligible || 'trusted_traders';
  end if;

  if coalesce(v_val, 0) >= 100000 then
    eligible := eligible || 'high_value_collectors';
  end if;

  if coalesce(trim(v_artist), '') <> '' then
    eligible := eligible || 'artist_devotees';
  end if;

  if coalesce(v_seasonal, 0) >= 1 or coalesce(v_has_participation, false) then
    eligible := eligible || 'seasonal_grinders';
  end if;

  delete from public.user_clubs u
  where u.user_id = p_user_id
    and not (u.club_id = any(eligible));

  insert into public.user_clubs (user_id, club_id, assigned_at)
  select p_user_id, x.cid, now()
  from unnest(eligible) as x(cid)
  on conflict (user_id, club_id) do nothing;
end;
$$;

revoke all on function public.refresh_user_clubs(uuid) from public;
grant execute on function public.refresh_user_clubs(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Read RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_user_clubs(p_user_id uuid)
returns table (
  club_id text,
  assigned_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select u.club_id, u.assigned_at
  from public.user_clubs u
  where u.user_id = p_user_id
  order by u.assigned_at asc, u.club_id asc;
$$;

revoke all on function public.get_user_clubs(uuid) from public;
grant execute on function public.get_user_clubs(uuid) to authenticated;

create or replace function public.get_users_clubs_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  club_id text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.user_id, u.club_id
  from public.user_clubs u
  where u.user_id = any(p_user_ids)
  order by u.user_id asc, u.assigned_at asc, u.club_id asc;
$$;

revoke all on function public.get_users_clubs_batch(uuid[]) from public;
grant execute on function public.get_users_clubs_batch(uuid[]) to authenticated;

create or replace function public.get_club_members(
  p_club_id text,
  p_limit int,
  p_offset int,
  p_viewer_id uuid default null
)
returns table (
  user_id uuid,
  display_name text,
  username text,
  handle text,
  avatar_url text,
  persona_text text,
  similarity_score float8
)
language sql
stable
security definer
set search_path = public
as $$
  with members as (
    select uc.user_id, uc.assigned_at
    from public.user_clubs uc
    where uc.club_id = trim(p_club_id)
    order by uc.assigned_at desc
    limit greatest(1, least(coalesce(p_limit, 24), 100))
    offset greatest(0, coalesce(p_offset, 0))
  )
  select
    m.user_id,
    coalesce(nullif(trim(sp.display_name), ''), sp.username, '')::text as display_name,
    coalesce(sp.username, '')::text as username,
    coalesce(sp.handle, '')::text as handle,
    coalesce(sp.avatar_url, '')::text as avatar_url,
    coalesce(pc.persona_text, '')::text as persona_text,
    (
      select x.score::float8
      from public.user_similarity_cache c
      cross join lateral (
        select u.uid, u.score
        from unnest(c.similar_user_ids, c.similarity_scores) as u(uid, score)
      ) x
      where c.user_id = p_viewer_id
        and x.uid = m.user_id
      limit 1
    ) as similarity_score
  from members m
  left join public.social_public_profiles sp on sp.user_id = m.user_id
  left join public.user_persona_cache pc on pc.user_id = m.user_id;
$$;

revoke all on function public.get_club_members(text, int, int, uuid) from public;
grant execute on function public.get_club_members(text, int, int, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers (identity writes + seasonal participation + persona)
-- ---------------------------------------------------------------------------

create or replace function public.trg_refresh_user_clubs_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := coalesce(new.user_id, old.user_id);
  if uid is not null then
    perform public.refresh_user_clubs(uid);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.trg_refresh_user_clubs_row() from public;

drop trigger if exists tr_user_clubs_play on public.user_play_identity;
create trigger tr_user_clubs_play
  after insert or update on public.user_play_identity
  for each row execute function public.trg_refresh_user_clubs_row();

drop trigger if exists tr_user_clubs_fandom on public.user_fandom_identity;
create trigger tr_user_clubs_fandom
  after insert or update on public.user_fandom_identity
  for each row execute function public.trg_refresh_user_clubs_row();

drop trigger if exists tr_user_clubs_value on public.user_collection_value_cache;
create trigger tr_user_clubs_value
  after insert or update on public.user_collection_value_cache
  for each row execute function public.trg_refresh_user_clubs_row();

drop trigger if exists tr_user_clubs_trade on public.user_trade_reputation;
create trigger tr_user_clubs_trade
  after insert or update on public.user_trade_reputation
  for each row execute function public.trg_refresh_user_clubs_row();

drop trigger if exists tr_user_clubs_persona on public.user_persona_cache;
create trigger tr_user_clubs_persona
  after insert or update on public.user_persona_cache
  for each row execute function public.trg_refresh_user_clubs_row();

create or replace function public.trg_refresh_user_clubs_seasonal_ins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.refresh_user_clubs(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_refresh_user_clubs_seasonal_ins() from public;

drop trigger if exists tr_user_clubs_seasonal on public.seasonal_event_participation;
create trigger tr_user_clubs_seasonal
  after insert on public.seasonal_event_participation
  for each row execute function public.trg_refresh_user_clubs_seasonal_ins();

create or replace function public.trg_refresh_user_clubs_badges_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null
     and (
       new.badge_type = 'seasonal_event'
       or (new.badge_type = 'trade_reputation' and new.badge_key in ('trusted_trader', 'veteran_trader', 'reliable_shop'))
     ) then
    perform public.refresh_user_clubs(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_refresh_user_clubs_badges_row() from public;

drop trigger if exists tr_user_clubs_badges on public.user_badges;
create trigger tr_user_clubs_badges
  after insert on public.user_badges
  for each row execute function public.trg_refresh_user_clubs_badges_row();

-- ---------------------------------------------------------------------------
-- Hook journey + mastery refresh (single call per recompute, avoids row spam)
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

  perform public.refresh_user_clubs(p_user_id);
end;
$$;

revoke all on function public.refresh_user_collection_mastery(uuid) from public;
grant execute on function public.refresh_user_collection_mastery(uuid) to service_role;

create or replace function public.refresh_user_journey_progress(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scan int;
  v_binders int;
  v_sets int;
  v_streak int;
  v_rep bigint;
  v_has_seasonal boolean;
begin
  if p_user_id is null then
    return;
  end if;

  select coalesce(count(*)::int, 0) into v_scan
  from public.scan_events
  where user_id = p_user_id;

  select coalesce(count(*)::int, 0) into v_binders
  from public.binders
  where user_id = p_user_id;

  select coalesce(count(distinct cc.set_id)::int, 0) into v_sets
  from public.cards c
  inner join public.catalog_cards cc on cc.id = c.catalog_card_id
  where c.user_id = p_user_id
    and c.catalog_card_id is not null;

  select coalesce(max(s.streak_count), 0) into v_streak
  from public.user_activity_streaks s
  where s.user_id = p_user_id;

  select coalesce(max(rc.score), 0)::bigint into v_rep
  from public.user_reputation_cache rc
  where rc.user_id = p_user_id;

  if v_rep is null then
    v_rep := 0;
  end if;

  select exists (
    select 1
    from public.user_badges b
    where b.user_id = p_user_id
      and b.badge_type = 'seasonal_event'
  ) into v_has_seasonal;

  perform public._journey_merge_progress(
    p_user_id,
    'first_50_scans',
    least(v_scan, 50),
    v_scan >= 50,
    'journey_scan_50'
  );

  perform public._journey_merge_progress(
    p_user_id,
    'first_500_scans',
    least(v_scan, 500),
    v_scan >= 500,
    'journey_scan_500'
  );

  perform public._journey_merge_progress(
    p_user_id,
    'first_binder_complete',
    case when v_binders >= 1 then 1 else 0 end,
    v_binders >= 1,
    'journey_first_binder'
  );

  perform public._journey_merge_progress(
    p_user_id,
    'ten_unique_sets',
    least(v_sets, 10),
    v_sets >= 10,
    'journey_ten_sets'
  );

  perform public._journey_merge_progress(
    p_user_id,
    'seven_day_streak',
    least(v_streak, 7),
    v_streak >= 7,
    null
  );

  perform public._journey_merge_progress(
    p_user_id,
    'first_seasonal_badge',
    case when v_has_seasonal then 1 else 0 end,
    v_has_seasonal,
    'journey_first_seasonal'
  );

  perform public._journey_merge_progress(
    p_user_id,
    'thousand_reputation',
    case when v_rep >= 1000 then 1 else 0 end,
    v_rep >= 1000,
    'journey_rep_1000'
  );

  perform public.refresh_user_clubs(p_user_id);
end;
$$;

revoke all on function public.refresh_user_journey_progress(uuid) from public;

notify pgrst, 'reload schema';
