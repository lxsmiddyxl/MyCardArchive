-- Phases 81–90: economy pass schema (qualitative, no monetary fields).

-- Phase 82: trade room messages (plain text, no HTML).
create table if not exists public.market_trade_room_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint market_trade_room_messages_body_len check (char_length(body) <= 4000)
);

create index if not exists market_trade_room_messages_thread_idx
  on public.market_trade_room_messages (thread_id, created_at asc);

comment on table public.market_trade_room_messages is 'Sanitized negotiation chat per marketplace trade room (Phase 82).';

-- Phase 85: long-form showcase body + version history.
alter table public.collection_showcases
  add column if not exists long_form_body text;

comment on column public.collection_showcases.long_form_body is 'Sanitized markdown-style showcase narrative (Phase 85).';

create table if not exists public.showcase_version_snapshots (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references public.collection_showcases (id) on delete cascade,
  seq integer not null,
  title text not null,
  description text,
  long_form_body text,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint showcase_version_snapshots_showcase_seq unique (showcase_id, seq)
);

create index if not exists showcase_version_snapshots_showcase_idx
  on public.showcase_version_snapshots (showcase_id, seq desc);

comment on table public.showcase_version_snapshots is 'Read-only showcase edit history (Phase 85).';

-- Phase 86: community thread grouping.
alter table public.community_posts
  add column if not exists thread_id uuid;

create index if not exists community_posts_thread_idx
  on public.community_posts (thread_id, created_at desc)
  where thread_id is not null;

comment on column public.community_posts.thread_id is 'Groups posts into a thread (Phase 86); root post uses id as thread when unset on insert.';

-- RLS for new tables
alter table public.market_trade_room_messages enable row level security;
alter table public.showcase_version_snapshots enable row level security;

create policy "market_trade_room_messages_select_participants"
  on public.market_trade_room_messages for select to authenticated
  using (
    exists (
      select 1 from public.market_offers o
      where o.thread_id = market_trade_room_messages.thread_id
        and (o.from_user_id = auth.uid() or o.to_user_id = auth.uid())
    )
  );

create policy "market_trade_room_messages_insert_participants"
  on public.market_trade_room_messages for insert to authenticated
  with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.market_offers o
      where o.thread_id = market_trade_room_messages.thread_id
        and (o.from_user_id = auth.uid() or o.to_user_id = auth.uid())
    )
  );

create policy "showcase_version_snapshots_select_public_or_owner"
  on public.showcase_version_snapshots for select to authenticated
  using (
    exists (
      select 1 from public.collection_showcases s
      where s.id = showcase_version_snapshots.showcase_id
        and (s.user_id = auth.uid() or auth.uid() is not null)
    )
  );

grant select, insert on public.market_trade_room_messages to authenticated;
grant select on public.showcase_version_snapshots to authenticated;
