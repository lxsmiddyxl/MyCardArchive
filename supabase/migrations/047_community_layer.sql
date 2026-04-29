-- Phase 65: Community layer — lightweight posts, likes, comments (RLS-safe).

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_body_len check (char_length(body) <= 8000)
);

create index community_posts_created_idx on public.community_posts (created_at desc);
create index community_posts_author_idx on public.community_posts (author_id);

comment on table public.community_posts is 'Public community feed posts (non-transactional).';

alter table public.community_posts enable row level security;

create policy "community_posts_select_authenticated"
  on public.community_posts for select to authenticated using (true);

create policy "community_posts_insert_own"
  on public.community_posts for insert to authenticated
  with check (auth.uid() = author_id);

create policy "community_posts_update_own"
  on public.community_posts for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "community_posts_delete_own"
  on public.community_posts for delete to authenticated
  using (auth.uid() = author_id);

grant select, insert, update, delete on public.community_posts to authenticated;

create table public.community_post_likes (
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index community_post_likes_user_idx on public.community_post_likes (user_id);

alter table public.community_post_likes enable row level security;

create policy "community_post_likes_select_authenticated"
  on public.community_post_likes for select to authenticated using (true);

create policy "community_post_likes_insert_own"
  on public.community_post_likes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "community_post_likes_delete_own"
  on public.community_post_likes for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.community_post_likes to authenticated;

create table public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint community_post_comments_body_len check (char_length(body) <= 4000)
);

create index community_post_comments_post_idx on public.community_post_comments (post_id, created_at);

alter table public.community_post_comments enable row level security;

create policy "community_post_comments_select_authenticated"
  on public.community_post_comments for select to authenticated using (true);

create policy "community_post_comments_insert_own"
  on public.community_post_comments for insert to authenticated
  with check (auth.uid() = author_id);

create policy "community_post_comments_update_own"
  on public.community_post_comments for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "community_post_comments_delete_own"
  on public.community_post_comments for delete to authenticated
  using (auth.uid() = author_id);

grant select, insert, update, delete on public.community_post_comments to authenticated;
