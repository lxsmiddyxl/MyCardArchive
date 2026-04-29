-- Phase 80: Reactions, threaded replies, lightweight moderation (hide comment).

create table public.community_post_reactions (
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction),
  constraint community_post_reactions_emoji check (
    reaction in ('👍', '❤️', '🔥', '😂', '🎉')
  )
);

create index community_post_reactions_post_idx on public.community_post_reactions (post_id);

comment on table public.community_post_reactions is 'Per-post emoji reactions (Phase 80).';

alter table public.community_post_comments
  add column if not exists parent_comment_id uuid references public.community_post_comments (id) on delete cascade,
  add column if not exists hidden boolean not null default false;

create index community_post_comments_parent_idx on public.community_post_comments (parent_comment_id);

comment on column public.community_post_comments.parent_comment_id is 'Optional parent for threaded replies (Phase 80).';
comment on column public.community_post_comments.hidden is 'Hidden by post author moderation (Phase 80).';

alter table public.community_post_reactions enable row level security;

create policy "community_post_reactions_select_authenticated"
  on public.community_post_reactions for select to authenticated using (true);

create policy "community_post_reactions_insert_own"
  on public.community_post_reactions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "community_post_reactions_delete_own"
  on public.community_post_reactions for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.community_post_reactions to authenticated;

create or replace function public.community_set_comment_hidden(p_comment_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
begin
  select p.author_id into post_author
  from public.community_post_comments c
  inner join public.community_posts p on p.id = c.post_id
  where c.id = p_comment_id;

  if post_author is null then
    raise exception 'not found';
  end if;

  if post_author <> auth.uid() then
    raise exception 'forbidden';
  end if;

  update public.community_post_comments
  set hidden = p_hidden
  where id = p_comment_id;
end;
$$;

comment on function public.community_set_comment_hidden(uuid, boolean) is 'Post author toggles visibility of a comment on their thread (Phase 80).';

grant execute on function public.community_set_comment_hidden(uuid, boolean) to authenticated;
