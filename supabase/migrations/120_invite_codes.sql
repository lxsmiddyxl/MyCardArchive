-- Launch Prep Phase 4: invite codes for first user wave.

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invite_codes_code_len check (char_length(code) >= 6 and char_length(code) <= 32),
  constraint invite_codes_code_format check (code ~ '^[A-Z0-9-]+$')
);

create unique index if not exists invite_codes_code_lower_idx
  on public.invite_codes (lower(code));

alter table public.invite_codes enable row level security;

drop policy if exists "invite_codes_select_own" on public.invite_codes;
create policy "invite_codes_select_own"
  on public.invite_codes
  for select
  to authenticated
  using (auth.uid() = created_by);

drop policy if exists "invite_codes_insert_auth" on public.invite_codes;
create policy "invite_codes_insert_auth"
  on public.invite_codes
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.internal_unlimited iu
      where iu.user_id = auth.uid()
    )
  );

grant select, insert on table public.invite_codes to authenticated;

comment on table public.invite_codes is
  'Launch invite codes; redemption via server routes (service role).';
