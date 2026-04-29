-- Lightweight reputation cache, activity streaks, shop CSV signal, and RPCs for social flair.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.user_reputation_cache (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  score bigint not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.user_reputation_cache is
  'Denormalized reputation: posts, comments, likes received, scans (refreshed on activity triggers).';

create index if not exists user_reputation_cache_updated_idx
  on public.user_reputation_cache (updated_at desc);

alter table public.user_reputation_cache enable row level security;

drop policy if exists "user_reputation_cache_select_authenticated" on public.user_reputation_cache;
create policy "user_reputation_cache_select_authenticated"
  on public.user_reputation_cache
  for select
  to authenticated
  using (true);

grant select on table public.user_reputation_cache to authenticated;

create table if not exists public.user_activity_streaks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  streak_count int not null default 0,
  last_active_date date
);

comment on table public.user_activity_streaks is
  'UTC calendar-day streak when user scans, posts, comments, or likes.';

alter table public.user_activity_streaks enable row level security;

drop policy if exists "user_activity_streaks_select_authenticated" on public.user_activity_streaks;
create policy "user_activity_streaks_select_authenticated"
  on public.user_activity_streaks
  for select
  to authenticated
  using (true);

grant select on table public.user_activity_streaks to authenticated;

create table if not exists public.user_shop_signals (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  csv_export_count int not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.user_shop_signals is
  'Business CSV export usage (incremented from inventory CSV route).';

alter table public.user_shop_signals enable row level security;

drop policy if exists "user_shop_signals_select_authenticated" on public.user_shop_signals;
create policy "user_shop_signals_select_authenticated"
  on public.user_shop_signals
  for select
  to authenticated
  using (true);

grant select on table public.user_shop_signals to authenticated;

-- ---------------------------------------------------------------------------
-- Core functions (security definer; writes bypass RLS for service role owner)
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_reputation(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_posts bigint;
  v_comments bigint;
  v_likes_received bigint;
  v_scans bigint;
  v_score bigint;
begin
  if p_user_id is null then
    return;
  end if;

  select count(*)::bigint into v_posts
  from public.community_posts
  where author_id = p_user_id;

  select count(*)::bigint into v_comments
  from public.community_post_comments
  where author_id = p_user_id;

  select count(*)::bigint into v_likes_received
  from public.community_post_likes l
  inner join public.community_posts p on p.id = l.post_id
  where p.author_id = p_user_id;

  select count(*)::bigint into v_scans
  from public.scan_events
  where user_id = p_user_id;

  v_score :=
    v_posts * 10
    + v_comments * 5
    + v_likes_received * 2
    + v_scans * 1;

  insert into public.user_reputation_cache (user_id, score, updated_at)
  values (p_user_id, v_score, now())
  on conflict (user_id) do update set
    score = excluded.score,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.refresh_user_reputation(uuid) from public;

create or replace function public.touch_user_activity_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('utc', now()))::date;
  v_last date;
  v_streak int;
begin
  if p_user_id is null then
    return;
  end if;

  select last_active_date, streak_count
    into v_last, v_streak
  from public.user_activity_streaks
  where user_id = p_user_id;

  if not found then
    insert into public.user_activity_streaks (user_id, streak_count, last_active_date)
    values (p_user_id, 1, v_today);
    return;
  end if;

  if v_last = v_today then
    return;
  elsif v_last = v_today - 1 then
    update public.user_activity_streaks
    set streak_count = coalesce(v_streak, 0) + 1,
        last_active_date = v_today
    where user_id = p_user_id;
  else
    update public.user_activity_streaks
    set streak_count = 1,
        last_active_date = v_today
    where user_id = p_user_id;
  end if;
end;
$$;

revoke all on function public.touch_user_activity_streak(uuid) from public;

create or replace function public.record_csv_export_usage(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.user_shop_signals (user_id, csv_export_count, updated_at)
  values (p_user_id, 1, now())
  on conflict (user_id) do update set
    csv_export_count = public.user_shop_signals.csv_export_count + 1,
    updated_at = now();
end;
$$;

revoke all on function public.record_csv_export_usage(uuid) from public;
grant execute on function public.record_csv_export_usage(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: single-user reputation (read-through cache)
-- ---------------------------------------------------------------------------

create or replace function public.get_user_reputation(p_user_id uuid)
returns table (
  score bigint,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_score bigint;
  v_updated timestamptz;
begin
  select c.score, c.updated_at into v_score, v_updated
  from public.user_reputation_cache c
  where c.user_id = p_user_id;

  if not found then
    perform public.refresh_user_reputation(p_user_id);
    select c.score, c.updated_at into v_score, v_updated
    from public.user_reputation_cache c
    where c.user_id = p_user_id;
  end if;

  score := coalesce(v_score, 0);
  updated_at := coalesce(v_updated, now());
  return next;
end;
$$;

revoke all on function public.get_user_reputation(uuid) from public;
grant execute on function public.get_user_reputation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: batch context for API enrichment (one round-trip)
-- ---------------------------------------------------------------------------

create or replace function public.get_users_social_flair_context(p_user_ids uuid[])
returns table (
  user_id uuid,
  reputation_score bigint,
  reputation_updated_at timestamptz,
  streak_count int,
  last_active_date date,
  csv_export_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.uid,
    coalesce(c.score, 0)::bigint,
    c.updated_at,
    coalesce(s.streak_count, 0)::int,
    s.last_active_date,
    coalesce(sh.csv_export_count, 0)::bigint
  from unnest(p_user_ids) as u(uid)
  left join public.user_reputation_cache c on c.user_id = u.uid
  left join public.user_activity_streaks s on s.user_id = u.uid
  left join public.user_shop_signals sh on sh.user_id = u.uid;
$$;

revoke all on function public.get_users_social_flair_context(uuid[]) from public;
grant execute on function public.get_users_social_flair_context(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger helpers
-- ---------------------------------------------------------------------------

create or replace function public.trg_reputation_refresh_post_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid;
begin
  aid := coalesce(new.author_id, old.author_id);
  if aid is not null then
    perform public.refresh_user_reputation(aid);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_reputation_refresh_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid;
begin
  aid := coalesce(new.author_id, old.author_id);
  if aid is not null then
    perform public.refresh_user_reputation(aid);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_reputation_refresh_like_post_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
  author uuid;
begin
  pid := coalesce(new.post_id, old.post_id);
  if pid is null then
    return coalesce(new, old);
  end if;
  select p.author_id into author from public.community_posts p where p.id = pid limit 1;
  if author is not null then
    perform public.refresh_user_reputation(author);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_reputation_refresh_scan_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.refresh_user_reputation(new.user_id);
    perform public.touch_user_activity_streak(new.user_id);
  end if;
  return new;
end;
$$;

create or replace function public.trg_streak_touch_post_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_id is not null then
    perform public.touch_user_activity_streak(new.author_id);
  end if;
  return new;
end;
$$;

create or replace function public.trg_streak_touch_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_id is not null then
    perform public.touch_user_activity_streak(new.author_id);
  end if;
  return new;
end;
$$;

create or replace function public.trg_streak_touch_like_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    perform public.touch_user_activity_streak(new.user_id);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Attach triggers
-- ---------------------------------------------------------------------------

drop trigger if exists user_reputation_community_posts_ai on public.community_posts;
create trigger user_reputation_community_posts_ai
  after insert on public.community_posts
  for each row
  execute function public.trg_reputation_refresh_post_author();

drop trigger if exists user_reputation_community_posts_ad on public.community_posts;
create trigger user_reputation_community_posts_ad
  after delete on public.community_posts
  for each row
  execute function public.trg_reputation_refresh_post_author();

drop trigger if exists user_streak_community_posts_ai on public.community_posts;
create trigger user_streak_community_posts_ai
  after insert on public.community_posts
  for each row
  execute function public.trg_streak_touch_post_author();

drop trigger if exists user_reputation_comments_ai on public.community_post_comments;
create trigger user_reputation_comments_ai
  after insert on public.community_post_comments
  for each row
  execute function public.trg_reputation_refresh_comment_author();

drop trigger if exists user_reputation_comments_ad on public.community_post_comments;
create trigger user_reputation_comments_ad
  after delete on public.community_post_comments
  for each row
  execute function public.trg_reputation_refresh_comment_author();

drop trigger if exists user_streak_comments_ai on public.community_post_comments;
create trigger user_streak_comments_ai
  after insert on public.community_post_comments
  for each row
  execute function public.trg_streak_touch_comment_author();

drop trigger if exists user_reputation_likes_aiud on public.community_post_likes;
create trigger user_reputation_likes_aiud
  after insert or delete on public.community_post_likes
  for each row
  execute function public.trg_reputation_refresh_like_post_author();

drop trigger if exists user_streak_likes_ai on public.community_post_likes;
create trigger user_streak_likes_ai
  after insert on public.community_post_likes
  for each row
  execute function public.trg_streak_touch_like_actor();

drop trigger if exists user_reputation_scan_events_ai on public.scan_events;
create trigger user_reputation_scan_events_ai
  after insert on public.scan_events
  for each row
  execute function public.trg_reputation_refresh_scan_user();

-- Milestone badge insert: bump cache so reputation stays aligned with milestone moments
create or replace function public.trg_reputation_on_scan_milestone_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.badge_type = 'scan_milestone' and new.user_id is not null then
    perform public.refresh_user_reputation(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists user_reputation_user_badges_scan_milestone_ai on public.user_badges;
create trigger user_reputation_user_badges_scan_milestone_ai
  after insert on public.user_badges
  for each row
  execute function public.trg_reputation_on_scan_milestone_badge();

notify pgrst, 'reload schema';
