-- Phase 67: Global feed projection — append-only feed_events + ranking RPC.

create table public.feed_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    constraint feed_events_kind_check check (
      kind in ('post', 'like', 'comment', 'follow', 'market_offer')
    ),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index feed_events_created_idx on public.feed_events (created_at desc);
create index feed_events_actor_idx on public.feed_events (actor_id, created_at desc);

comment on table public.feed_events is 'Ranked global activity stream (projection from social + marketplace).';

alter table public.feed_events enable row level security;

create policy "feed_events_select_authenticated"
  on public.feed_events for select to authenticated using (true);

-- Inserts only via SECURITY DEFINER triggers (no direct client insert).
revoke insert, update, delete on public.feed_events from authenticated;
grant select on public.feed_events to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers → feed_events
-- ---------------------------------------------------------------------------

create or replace function public.feed_from_community_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.feed_events (kind, actor_id, subject_id, payload)
  values (
    'post',
    new.author_id,
    new.id,
    jsonb_build_object('snippet', left(new.body, 240))
  );
  return new;
end;
$$;

drop trigger if exists trg_feed_community_posts on public.community_posts;
create trigger trg_feed_community_posts
  after insert on public.community_posts
  for each row
  execute function public.feed_from_community_post();

create or replace function public.feed_from_community_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.feed_events (kind, actor_id, subject_id, payload)
  values (
    'like',
    new.user_id,
    new.post_id,
    jsonb_build_object('post_id', new.post_id)
  );
  return new;
end;
$$;

drop trigger if exists trg_feed_community_likes on public.community_post_likes;
create trigger trg_feed_community_likes
  after insert on public.community_post_likes
  for each row
  execute function public.feed_from_community_like();

create or replace function public.feed_from_community_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.feed_events (kind, actor_id, subject_id, payload)
  values (
    'comment',
    new.author_id,
    new.post_id,
    jsonb_build_object('comment_id', new.id, 'snippet', left(new.body, 200))
  );
  return new;
end;
$$;

drop trigger if exists trg_feed_community_comments on public.community_post_comments;
create trigger trg_feed_community_comments
  after insert on public.community_post_comments
  for each row
  execute function public.feed_from_community_comment();

create or replace function public.feed_from_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.feed_events (kind, actor_id, subject_id, payload)
  values (
    'follow',
    new.follower_id,
    new.following_id,
    jsonb_build_object('following_id', new.following_id)
  );
  return new;
end;
$$;

drop trigger if exists trg_feed_user_follows on public.user_follows;
create trigger trg_feed_user_follows
  after insert on public.user_follows
  for each row
  execute function public.feed_from_follow();

create or replace function public.feed_from_market_offer_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.feed_events (kind, actor_id, subject_id, payload)
  values (
    'market_offer',
    new.actor_id,
    new.offer_id,
    jsonb_build_object('thread_id', new.thread_id, 'event_type', new.event_type)
  );
  return new;
end;
$$;

drop trigger if exists trg_feed_market_offer_events on public.market_offer_events;
create trigger trg_feed_market_offer_events
  after insert on public.market_offer_events
  for each row
  execute function public.feed_from_market_offer_event();

-- ---------------------------------------------------------------------------
-- Ranking: recency + mutual boost
-- ---------------------------------------------------------------------------

create or replace function public.get_global_feed(p_limit integer default 24, p_before timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid uuid := auth.uid();
  lim integer := greatest(1, least(coalesce(p_limit, 24), 50));
begin
  if uid is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(t))
      from (
        select
          fe.id,
          fe.kind,
          fe.actor_id,
          fe.subject_id,
          fe.payload,
          fe.created_at,
          (
            extract(epoch from fe.created_at)
            + case
              when exists (
                select 1 from public.social_mutual_pairs smp
                where (smp.user_low = uid and smp.user_high = fe.actor_id)
                   or (smp.user_high = uid and smp.user_low = fe.actor_id)
              ) then 86400.0
              else 0.0
            end
          ) as rank_score
        from public.feed_events fe
        where p_before is null or fe.created_at < p_before
        order by rank_score desc, fe.created_at desc
        limit lim
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

comment on function public.get_global_feed(integer, timestamptz) is
  'Global feed: higher score = stronger signal (recency + mutual trainer boost).';

grant execute on function public.get_global_feed(integer, timestamptz) to authenticated;
