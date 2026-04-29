-- Ensure every auth.users row has a public.profiles row (FK anchor for app data).
-- Uses auth.users.created_at for profiles.created_at and profiles.joined_at (060 NOT NULL).

insert into public.profiles (id, email, created_at, joined_at)
select
  u.id,
  u.email,
  coalesce(u.created_at, now()),
  coalesce(u.created_at, now())
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
