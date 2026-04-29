-- Phase 75: Creator economy v2 — premium guide sections + showcase analytics.

alter table public.deck_guides
  add column if not exists premium_sections jsonb not null default '[]'::jsonb,
  add column if not exists analytics_views int not null default 0,
  add column if not exists analytics_saves int not null default 0;

comment on column public.deck_guides.premium_sections is 'Gated sections [{title, body, locked?}] for monetizable guides.';
comment on column public.deck_guides.analytics_views is 'Aggregate guide views (incremented server-side).';
comment on column public.deck_guides.analytics_saves is 'Bookmark/save count (incremented server-side).';

alter table public.collection_showcases
  add column if not exists analytics_views int not null default 0,
  add column if not exists analytics_saves int not null default 0;

comment on column public.collection_showcases.analytics_views is 'Showcase page views.';
comment on column public.collection_showcases.analytics_saves is 'Showcase saves/bookmarks.';

create or replace function public.increment_deck_guide_views(p_guide_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.deck_guides g
  set analytics_views = analytics_views + 1, updated_at = now()
  from public.decks d
  where g.id = p_guide_id
    and g.deck_id = d.id
    and auth.uid() is not null
    and (
      auth.uid() = g.user_id
      or d.is_public = true
    );
end;
$$;

create or replace function public.increment_showcase_views(p_showcase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.collection_showcases s
  set analytics_views = analytics_views + 1, updated_at = now()
  where s.id = p_showcase_id
    and auth.uid() is not null;
end;
$$;

grant execute on function public.increment_deck_guide_views(uuid) to authenticated;
grant execute on function public.increment_showcase_views(uuid) to authenticated;
