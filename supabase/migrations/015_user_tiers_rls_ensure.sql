-- Ensure user_tiers RLS allows each authenticated user to read and upsert their own row
-- (required for client-side ensureUserTier / repair flows).

alter table public.user_tiers enable row level security;

drop policy if exists "user_tiers_select_own" on public.user_tiers;
drop policy if exists "user_tiers_insert_own" on public.user_tiers;
drop policy if exists "user_tiers_update_own" on public.user_tiers;

create policy "user_tiers_select_own"
  on public.user_tiers
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_tiers_insert_own"
  on public.user_tiers
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_tiers_update_own"
  on public.user_tiers
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
