-- Block 8: Internal unlimited entitlement override (founder / designated accounts).
-- Rows are invisible cross-user: RLS allows SELECT only for auth.uid() = user_id.
-- Seed inserts via Supabase SQL editor or service role — not exposed in app UI.

create table if not exists public.internal_unlimited (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.internal_unlimited is
  'Staff/founder unlimited entitlement — enforced server-side; never surface on public profile APIs.';

alter table public.internal_unlimited enable row level security;

drop policy if exists "internal_unlimited_select_own" on public.internal_unlimited;
create policy "internal_unlimited_select_own"
  on public.internal_unlimited for select to authenticated
  using (user_id = auth.uid());

grant select on public.internal_unlimited to authenticated;
