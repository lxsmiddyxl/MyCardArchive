-- RPC: unlock achievement by slug (server / service role only).

create or replace function public.apply_achievement_unlock(
  user_id uuid,
  achievement_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_achievement_id uuid;
begin
  select a.id
    into v_achievement_id
  from public.achievements a
  where a.slug = achievement_slug
  limit 1;

  if v_achievement_id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'Unknown achievement'
    );
  end if;

  if exists (
    select 1
    from public.user_achievements ua
    where ua.user_id = apply_achievement_unlock.user_id
      and ua.achievement_id = v_achievement_id
  ) then
    return jsonb_build_object(
      'ok', true,
      'already', true
    );
  end if;

  insert into public.user_achievements (user_id, achievement_id)
  values (apply_achievement_unlock.user_id, v_achievement_id);

  return jsonb_build_object(
    'ok', true,
    'achievement_slug', achievement_slug
  );
end;
$$;

comment on function public.apply_achievement_unlock(uuid, text) is
  'Idempotent unlock by achievement slug. Callable only with service_role.';

revoke all on function public.apply_achievement_unlock(uuid, text) from public;
revoke all on function public.apply_achievement_unlock(uuid, text) from anon;
revoke all on function public.apply_achievement_unlock(uuid, text) from authenticated;
grant execute on function public.apply_achievement_unlock(uuid, text) to service_role;

notify pgrst, 'reload schema';
