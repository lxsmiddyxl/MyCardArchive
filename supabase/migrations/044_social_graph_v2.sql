-- Phase 61: Social graph v2 — mutual follows projection + recommendation RPC.

-- ---------------------------------------------------------------------------
-- social_mutual_pairs — canonical undirected pair when both follow edges exist
-- ---------------------------------------------------------------------------

create table public.social_mutual_pairs (
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_low, user_high),
  constraint social_mutual_pairs_order check (user_low < user_high)
);

create index social_mutual_pairs_user_low_idx on public.social_mutual_pairs (user_low);
create index social_mutual_pairs_user_high_idx on public.social_mutual_pairs (user_high);

comment on table public.social_mutual_pairs is
  'Undirected mutual follow pairs (both directional edges in user_follows).';

alter table public.social_mutual_pairs enable row level security;

create policy "social_mutual_pairs_select_involved"
  on public.social_mutual_pairs
  for select
  to authenticated
  using (auth.uid() = user_low or auth.uid() = user_high);

grant select on table public.social_mutual_pairs to authenticated;

create or replace function public.sync_social_mutual_pair_from_edges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plow uuid;
  phigh uuid;
  fwd boolean;
  rev boolean;
begin
  if tg_op = 'INSERT' then
    plow := least(new.follower_id, new.following_id);
    phigh := greatest(new.follower_id, new.following_id);
    fwd := exists (
      select 1 from public.user_follows f
      where f.follower_id = plow and f.following_id = phigh
    );
    rev := exists (
      select 1 from public.user_follows f
      where f.follower_id = phigh and f.following_id = plow
    );
    if fwd and rev then
      insert into public.social_mutual_pairs (user_low, user_high, updated_at)
      values (plow, phigh, now())
      on conflict (user_low, user_high) do update set updated_at = excluded.updated_at;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    plow := least(old.follower_id, old.following_id);
    phigh := greatest(old.follower_id, old.following_id);
    fwd := exists (
      select 1 from public.user_follows f
      where f.follower_id = plow and f.following_id = phigh
    );
    rev := exists (
      select 1 from public.user_follows f
      where f.follower_id = phigh and f.following_id = plow
    );
    if not (fwd and rev) then
      delete from public.social_mutual_pairs where user_low = plow and user_high = phigh;
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_user_follows_mutual_sync on public.user_follows;
create trigger trg_user_follows_mutual_sync
  after insert or delete on public.user_follows
  for each row
  execute function public.sync_social_mutual_pair_from_edges();

insert into public.social_mutual_pairs (user_low, user_high, updated_at)
select distinct
  least(f.follower_id, f.following_id) as user_low,
  greatest(f.follower_id, f.following_id) as user_high,
  now()
from public.user_follows f
where exists (
  select 1
  from public.user_follows g
  where g.follower_id = f.following_id
    and g.following_id = f.follower_id
)
on conflict (user_low, user_high) do nothing;

-- ---------------------------------------------------------------------------
-- Recommendations (shared interests + trade overlap); excludes already-followed
-- ---------------------------------------------------------------------------

create or replace function public.get_social_recommendations(p_limit integer default 12)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid uuid := auth.uid();
  lim integer := greatest(1, least(coalesce(p_limit, 12), 50));
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  return coalesce(
    (
      with viewer_fav as (
        select coalesce(
          (
            select sp.favorite_sets
            from public.social_public_profiles sp
            where sp.user_id = uid
            limit 1
          ),
          '[]'::jsonb
        ) as fav
      ),
      candidates as (
        select p.id as cid
        from public.profiles p
        where p.id <> uid
          and not exists (
            select 1 from public.user_follows uf
            where uf.follower_id = uid and uf.following_id = p.id
          )
      ),
      fav_overlap as (
        select
          c.cid,
          coalesce(
            (
              select count(*)::integer
              from viewer_fav vf
              cross join public.social_public_profiles osp
              where osp.user_id = c.cid
                and exists (
                  select 1
                  from jsonb_array_elements_text(vf.fav) t1(v)
                  inner join jsonb_array_elements_text(coalesce(osp.favorite_sets, '[]'::jsonb)) t2(v)
                    on lower(trim(t1.v)) = lower(trim(t2.v))
                )
            ),
            0
          ) as overlap_n
        from candidates c
      ),
      trade_scores as (
        select
          c.cid,
          coalesce(
            (
              select count(*)::integer
              from public.user_wantlist_index w
              inner join public.user_havelist_index h on w.card_id = h.card_id
              where w.user_id = uid and h.user_id = c.cid
            ),
            0
          ) as n_they_have_you_want,
          coalesce(
            (
              select count(*)::integer
              from public.user_wantlist_index w
              inner join public.user_havelist_index h on w.card_id = h.card_id
              where w.user_id = c.cid and h.user_id = uid
            ),
            0
          ) as n_you_have_they_want
        from candidates c
      ),
      scored as (
        select
          c.cid,
          fo.overlap_n * 2
            + ts.n_they_have_you_want * 3
            + ts.n_you_have_they_want * 3 as score,
          case when fo.overlap_n > 0 then array['shared_interests']::text[] else array[]::text[] end
            || case when ts.n_they_have_you_want > 0 then array['they_have_what_you_want']::text[] else array[]::text[] end
            || case when ts.n_you_have_they_want > 0 then array['you_have_what_they_want']::text[] else array[]::text[] end
            as reasons
        from candidates c
        inner join fav_overlap fo on fo.cid = c.cid
        inner join trade_scores ts on ts.cid = c.cid
      ),
      topn as (
        select s.cid as user_id, s.score, s.reasons
        from scored s
        where s.score > 0
        order by s.score desc, s.cid
        limit lim
      )
      select coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'user_id', t.user_id,
              'score', t.score,
              'reasons', to_jsonb(t.reasons)
            )
            order by t.score desc, t.user_id
          )
          from topn t
        ),
        '[]'::jsonb
      )
    ),
    '[]'::jsonb
  );
end;
$$;

comment on function public.get_social_recommendations(integer) is
  'Suggested trainers: favorite-set overlap + want/have trade signals (definer).';

grant execute on function public.get_social_recommendations(integer) to authenticated;
