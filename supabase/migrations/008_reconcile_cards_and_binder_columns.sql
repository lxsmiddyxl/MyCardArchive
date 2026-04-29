-- Add missing `user_id` / `set_id` on `cards` and `user_id` on `binder_cards` when 006
-- was marked applied but DDL is incomplete. Runs before 009_card_system_rls_fks_indexes.

alter table public.cards
  add column if not exists user_id uuid references public.profiles (id) on delete cascade;

do $fill_cards$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cards'
      and column_name = 'binder_id'
  ) then
    update public.cards c
    set user_id = b.user_id
    from public.binders b
    where c.binder_id = b.id
      and c.user_id is null;
  end if;
end $fill_cards$;

do $cards_user_nn$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cards'
      and column_name = 'user_id'
  )
  and not exists (select 1 from public.cards where user_id is null) then
    alter table public.cards alter column user_id set not null;
  end if;
end $cards_user_nn$;

alter table public.cards
  add column if not exists set_id uuid references public.sets (id) on delete set null;

create index if not exists cards_user_id_idx on public.cards (user_id);
create index if not exists cards_set_id_idx on public.cards (set_id);

alter table public.binder_cards
  add column if not exists user_id uuid references public.profiles (id) on delete cascade;

update public.binder_cards bc
set user_id = c.user_id
from public.cards c
where bc.card_id = c.id
  and bc.user_id is null
  and c.user_id is not null;

do $bc_user_nn$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'binder_cards'
      and column_name = 'user_id'
  )
  and not exists (select 1 from public.binder_cards where user_id is null) then
    alter table public.binder_cards alter column user_id set not null;
  end if;
end $bc_user_nn$;

create index if not exists binder_cards_user_id_idx on public.binder_cards (user_id);
