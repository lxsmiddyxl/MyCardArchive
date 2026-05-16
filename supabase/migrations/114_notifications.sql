-- Binder Upgrade Arc Phase 4: notification payload for binder/social events.

alter table public.notifications
  add column if not exists payload jsonb not null default '{}'::jsonb;

comment on column public.notifications.payload is 'Structured metadata (binder_id, actor_id, etc.).';

create or replace function public.notifications_read_at_only_update()
returns trigger
language plpgsql
as $$
begin
  if row_to_json(old)::jsonb - 'read_at' <> row_to_json(new)::jsonb - 'read_at' then
    raise exception 'notifications: only read_at may be updated';
  end if;
  return new;
end;
$$;
