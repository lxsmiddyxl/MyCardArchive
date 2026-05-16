-- Binder Upgrade Arc Phase 4: follower helpers (edges live in user_follows from 042).

comment on table public.user_follows is
  'Directed follow edges (follower_id → following_id). Phase 4 alias: user_followers(follower_id, followed_id).';

create or replace function public.get_profile_follow_counts(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'followers',
    coalesce(
      (select count(*)::int from public.user_follows uf where uf.following_id = p_user_id),
      0
    ),
    'following',
    coalesce(
      (select count(*)::int from public.user_follows uf where uf.follower_id = p_user_id),
      0
    )
  );
$$;

grant execute on function public.get_profile_follow_counts(uuid) to anon, authenticated;
