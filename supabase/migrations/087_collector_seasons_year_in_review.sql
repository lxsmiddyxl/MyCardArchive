-- Collector seasons + year-in-review summaries (aggregates only; no sensitive payloads).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.user_season_summaries (
  user_id uuid not null references public.profiles (id) on delete cascade,
  season_id text not null check (season_id in ('spring', 'summer', 'fall', 'winter')),
  year int not null,
  summary_json jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  constraint user_season_summaries_pkey primary key (user_id, season_id, year)
);

create index if not exists user_season_summaries_user_idx
  on public.user_season_summaries (user_id, year desc);

comment on table public.user_season_summaries is
  'Deterministic seasonal aggregate summaries for profile and social highlights.';

alter table public.user_season_summaries enable row level security;

drop policy if exists "user_season_summaries_select_authenticated" on public.user_season_summaries;
create policy "user_season_summaries_select_authenticated"
  on public.user_season_summaries for select to authenticated using (true);

grant select on table public.user_season_summaries to authenticated;
grant all on table public.user_season_summaries to service_role;

create table if not exists public.user_year_in_review (
  user_id uuid not null references public.profiles (id) on delete cascade,
  year int not null,
  summary_json jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  viewed_at timestamptz,
  constraint user_year_in_review_pkey primary key (user_id, year)
);

create index if not exists user_year_in_review_user_idx
  on public.user_year_in_review (user_id, year desc);

comment on table public.user_year_in_review is
  'Annual collector recap; viewed_at supports optional flair — never auto-posted.';

alter table public.user_year_in_review enable row level security;

drop policy if exists "user_year_in_review_select_authenticated" on public.user_year_in_review;
create policy "user_year_in_review_select_authenticated"
  on public.user_year_in_review for select to authenticated using (true);

grant select on table public.user_year_in_review to authenticated;
grant all on table public.user_year_in_review to service_role;

-- ---------------------------------------------------------------------------
-- Season UTC bounds (anchor year matches TS getSeasonForDate)
-- ---------------------------------------------------------------------------

create or replace function public._season_date_bounds(p_season text, p_year int, out d0 date, out d1 date)
language plpgsql
immutable
parallel safe
as $$
begin
  case lower(trim(p_season))
    when 'spring' then
      d0 := make_date(p_year, 3, 1);
      d1 := make_date(p_year, 5, 31);
    when 'summer' then
      d0 := make_date(p_year, 6, 1);
      d1 := make_date(p_year, 8, 31);
    when 'fall' then
      d0 := make_date(p_year, 9, 1);
      d1 := make_date(p_year, 11, 30);
    when 'winter' then
      d0 := make_date(p_year - 1, 12, 1);
      d1 := (make_date(p_year, 3, 1) - 1);
    else
      d0 := null;
      d1 := null;
  end case;
end;
$$;

revoke all on function public._season_date_bounds(text, int) from public;

-- ---------------------------------------------------------------------------
-- generate_user_season_summary / generate_user_year_in_review
-- ---------------------------------------------------------------------------

create or replace function public.generate_user_season_summary(
  p_user_id uuid,
  p_year int,
  p_season text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d0 date;
  d1 date;
  v_scans int := 0;
  v_binder int := 0;
  v_set int := 0;
  v_streak int := 0;
  v_seasonal int := 0;
  v_journey int := 0;
  v_value int := 0;
  v_max_streak int := 0;
  v_persona text;
  v_fmt text;
  v_arch text;
  v_deck text;
  v_set_id text;
  v_era text;
  v_art text;
  v_char text;
  v_theme text;
  v_val bigint;
  j jsonb;
  v_highlight text;
  v_top_names jsonb := '[]'::jsonb;
begin
  if p_user_id is null or p_year is null or p_season is null or length(trim(p_season)) = 0 then
    return;
  end if;

  select s.d0, s.d1 into d0, d1 from public._season_date_bounds(trim(p_season), p_year) s;
  if d0 is null or d1 is null then
    return;
  end if;

  select count(*)::int into v_scans
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_date between d0 and d1 and l.activity_type = 'scan';

  select count(*)::int into v_binder
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_date between d0 and d1 and l.activity_type = 'binder_complete';

  select count(*)::int into v_set
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_date between d0 and d1 and l.activity_type = 'set_complete';

  select count(*)::int into v_streak
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_date between d0 and d1 and l.activity_type = 'streak_update';

  select coalesce(max((l.metadata->>'streakCount')::int), 0) into v_max_streak
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_date between d0 and d1 and l.activity_type = 'streak_update'
    and l.metadata ? 'streakCount';

  select count(*)::int into v_seasonal
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_date between d0 and d1 and l.activity_type = 'seasonal_event';

  select count(*)::int into v_journey
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_date between d0 and d1 and l.activity_type = 'journey_complete';

  select count(*)::int into v_value
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_date between d0 and d1 and l.activity_type = 'value_refresh';

  select c.persona_text into v_persona from public.user_persona_cache c where c.user_id = p_user_id;
  select p.favorite_format_id, p.favorite_archetype_id, p.favorite_deck_name
    into v_fmt, v_arch, v_deck
  from public.user_play_identity p where p.user_id = p_user_id;

  select f.favorite_set_id, f.favorite_era_id, f.favorite_artist_id, f.favorite_character_id, f.favorite_theme_id
    into v_set_id, v_era, v_art, v_char, v_theme
  from public.user_fandom_identity f where f.user_id = p_user_id;

  select c.estimated_value_cents into v_val from public.user_collection_value_cache c where c.user_id = p_user_id;

  select coalesce(jsonb_agg(x.name order by x.cnt desc), '[]'::jsonb) into v_top_names
  from (
    select d.name, count(dc.*)::int as cnt
    from public.decks d
    left join public.deck_cards dc on dc.deck_id = d.id
    where d.user_id = p_user_id
    group by d.id, d.name
    order by cnt desc
    limit 3
  ) x;

  v_highlight := concat(
    initcap(trim(p_season)), ' ', p_year::text,
    ' · ', v_scans::text, ' scans · ', (v_binder + v_set)::text, ' completions'
  );

  j := jsonb_build_object(
    'version', 1,
    'seasonId', lower(trim(p_season)),
    'year', p_year,
    'highlight', v_highlight,
    'scans', v_scans,
    'binderCompletions', v_binder,
    'setCompletions', v_set,
    'streakUpdates', v_streak,
    'maxStreakInSeason', case when v_max_streak > 0 then v_max_streak else null end,
    'seasonalEvents', v_seasonal,
    'journeyCompletions', v_journey,
    'valueRefreshEvents', v_value,
    'approxValueCentsEnd', v_val,
    'valueDisclaimer', 'Approximate, not audited or financial advice.',
    'fandomPins', jsonb_build_object(
      'favoriteSetId', v_set_id,
      'favoriteEraId', v_era,
      'favoriteArtistId', v_art,
      'favoriteCharacterId', v_char,
      'favoriteThemeId', v_theme
    ),
    'playSnapshot', jsonb_build_object(
      'favoriteFormatId', v_fmt,
      'favoriteArchetypeId', v_arch,
      'favoriteDeckName', v_deck
    ),
    'topDeckNames', v_top_names,
    'personaSnapshot', v_persona,
    'rangeStart', d0::text,
    'rangeEnd', d1::text
  );

  insert into public.user_season_summaries (user_id, season_id, year, summary_json, generated_at)
  values (p_user_id, lower(trim(p_season)), p_year, j, now())
  on conflict (user_id, season_id, year) do update set
    summary_json = excluded.summary_json,
    generated_at = excluded.generated_at;
end;
$$;

revoke all on function public.generate_user_season_summary(uuid, int, text) from public;

create or replace function public.generate_user_year_in_review(p_user_id uuid, p_year int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d0 date := make_date(p_year, 1, 1);
  d1 date := make_date(p_year, 12, 31);
  v_total int := 0;
  v_big_streak int := 0;
  v_grail int := 0;
  v_val bigint;
  v_val_ref int := 0;
  v_persona text;
  v_fmt text;
  v_set_id text;
  v_top_names jsonb := '[]'::jsonb;
  j jsonb;
  v_title text;
  v_dom text;
  v_top_months jsonb := '[]'::jsonb;
  v_first_scan date;
  v_first_binder date;
  v_first_set date;
  v_first_season date;
  v_first_journey date;
begin
  if p_user_id is null or p_year is null then
    return;
  end if;

  select count(*)::int into v_total
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_date between d0 and d1;

  select coalesce(max((l.metadata->>'streakCount')::int), 0) into v_big_streak
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_date between d0 and d1 and l.activity_type = 'streak_update'
    and l.metadata ? 'streakCount';

  select count(*)::int into v_grail
  from public.user_grail_cards g
  where g.user_id = p_user_id
    and (timezone('utc', g.added_at))::date between d0 and d1;

  select count(*)::int into v_val_ref
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_date between d0 and d1 and l.activity_type = 'value_refresh';

  select c.estimated_value_cents into v_val from public.user_collection_value_cache c where c.user_id = p_user_id;

  select c.persona_text into v_persona from public.user_persona_cache c where c.user_id = p_user_id;
  select p.favorite_format_id into v_fmt from public.user_play_identity p where p.user_id = p_user_id;
  select f.favorite_set_id into v_set_id from public.user_fandom_identity f where f.user_id = p_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'month', m.mo,
      'label', to_char(make_date(p_year, m.mo, 1), 'Mon'),
      'count', m.cnt
    ) order by m.cnt desc),
    '[]'::jsonb
  ) into v_top_months
  from (
    select extract(month from l.activity_date)::int as mo, count(*)::int as cnt
    from public.user_activity_log l
    where l.user_id = p_user_id and l.activity_date between d0 and d1
    group by 1
    order by cnt desc
    limit 3
  ) m;

  select min(l.activity_date) into v_first_scan
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'scan' and l.activity_date between d0 and d1;
  select min(l.activity_date) into v_first_binder
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'binder_complete' and l.activity_date between d0 and d1;
  select min(l.activity_date) into v_first_set
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'set_complete' and l.activity_date between d0 and d1;
  select min(l.activity_date) into v_first_season
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'seasonal_event' and l.activity_date between d0 and d1;
  select min(l.activity_date) into v_first_journey
  from public.user_activity_log l
  where l.user_id = p_user_id and l.activity_type = 'journey_complete' and l.activity_date between d0 and d1;

  select activity_type into v_dom
  from (
    select l.activity_type, count(*)::int as c
    from public.user_activity_log l
    where l.user_id = p_user_id and l.activity_date between d0 and d1
    group by 1
    order by c desc
    limit 1
  ) q;

  if coalesce(v_set_id, '') <> '' then
    v_title := 'The Set Chaser';
  elsif v_dom = 'scan' then
    v_title := 'The Field Scanner';
  elsif v_dom in ('binder_complete', 'binder_edit') then
    v_title := 'The Binder Architect';
  elsif v_dom = 'set_complete' then
    v_title := 'The Master Set Hunter';
  elsif coalesce(v_fmt, '') <> '' then
    v_title := concat('The ', upper(v_fmt), ' Duelist');
  else
    v_title := 'The Dedicated Collector';
  end if;

  select coalesce(jsonb_agg(x.name order by x.cnt desc), '[]'::jsonb) into v_top_names
  from (
    select d.name, count(dc.*)::int as cnt
    from public.decks d
    left join public.deck_cards dc on dc.deck_id = d.id
    where d.user_id = p_user_id
    group by d.id, d.name
    order by cnt desc
    limit 3
  ) x;

  j := jsonb_build_object(
    'version', 1,
    'year', p_year,
    'highlight', concat('Year ', p_year::text, ' · ', v_total::text, ' activities'),
    'totalActivities', v_total,
    'topMonths', v_top_months,
    'biggestStreak', case when v_big_streak > 0 then v_big_streak else null end,
    'firsts', jsonb_build_object(
      'firstScanDate', v_first_scan,
      'firstBinderDate', v_first_binder,
      'firstSetDate', v_first_set,
      'firstSeasonalDate', v_first_season,
      'firstJourneyDate', v_first_journey
    ),
    'topFandomPins', jsonb_build_object('favoriteSetId', v_set_id),
    'topDeckNames', v_top_names,
    'grailAddsInYear', v_grail,
    'valueRefreshEvents', v_val_ref,
    'approxValueCentsEnd', v_val,
    'valueDisclaimer', 'Approximate, not audited or financial advice.',
    'personaEvolution', jsonb_build_object(
      'startPersona', null,
      'endPersona', v_persona,
      'note', 'Historical persona text is not retained server-side; end reflects generate-time cache.'
    ),
    'collectorTitle', v_title,
    'rangeStart', d0::text,
    'rangeEnd', d1::text
  );

  insert into public.user_year_in_review (user_id, year, summary_json, generated_at)
  values (p_user_id, p_year, j, now())
  on conflict (user_id, year) do update set
    summary_json = excluded.summary_json,
    generated_at = excluded.generated_at;
end;
$$;

revoke all on function public.generate_user_year_in_review(uuid, int) from public;

-- ---------------------------------------------------------------------------
-- Read RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_user_season_summary(p_user_id uuid, p_year int, p_season text)
returns table (summary_json jsonb, generated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.summary_json, s.generated_at
  from public.user_season_summaries s
  where s.user_id = p_user_id
    and s.year = p_year
    and s.season_id = lower(trim(p_season))
  limit 1;
$$;

revoke all on function public.get_user_season_summary(uuid, int, text) from public;
grant execute on function public.get_user_season_summary(uuid, int, text) to authenticated;

create or replace function public.get_user_year_in_review(p_user_id uuid, p_year int)
returns table (summary_json jsonb, generated_at timestamptz, viewed_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select y.summary_json, y.generated_at, y.viewed_at
  from public.user_year_in_review y
  where y.user_id = p_user_id and y.year = p_year
  limit 1;
$$;

revoke all on function public.get_user_year_in_review(uuid, int) from public;
grant execute on function public.get_user_year_in_review(uuid, int) to authenticated;

create or replace function public.get_user_latest_year_in_review(p_user_id uuid)
returns table (year int, summary_json jsonb, generated_at timestamptz, viewed_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select y.year, y.summary_json, y.generated_at, y.viewed_at
  from public.user_year_in_review y
  where y.user_id = p_user_id
  order by y.year desc
  limit 1;
$$;

revoke all on function public.get_user_latest_year_in_review(uuid) from public;
grant execute on function public.get_user_latest_year_in_review(uuid) to authenticated;

create or replace function public.get_users_season_summary_batch(p_user_ids uuid[], p_year int, p_season text)
returns table (user_id uuid, summary_json jsonb, generated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.user_id, s.summary_json, s.generated_at
  from public.user_season_summaries s
  where s.user_id = any(p_user_ids)
    and s.year = p_year
    and s.season_id = lower(trim(p_season));
$$;

revoke all on function public.get_users_season_summary_batch(uuid[], int, text) from public;
grant execute on function public.get_users_season_summary_batch(uuid[], int, text) to authenticated;

create or replace function public.get_users_year_in_review_batch(p_user_ids uuid[], p_year int)
returns table (user_id uuid, summary_json jsonb, generated_at timestamptz, viewed_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select y.user_id, y.summary_json, y.generated_at, y.viewed_at
  from public.user_year_in_review y
  where y.user_id = any(p_user_ids) and y.year = p_year;
$$;

revoke all on function public.get_users_year_in_review_batch(uuid[], int) from public;
grant execute on function public.get_users_year_in_review_batch(uuid[], int) to authenticated;

create or replace function public.get_users_season_highlight_batch(p_user_ids uuid[], p_year int, p_season text)
returns table (user_id uuid, highlight text)
language sql
stable
security definer
set search_path = public
as $$
  select s.user_id, coalesce(s.summary_json->>'highlight', '')::text as highlight
  from public.user_season_summaries s
  where s.user_id = any(p_user_ids)
    and s.year = p_year
    and s.season_id = lower(trim(p_season));
$$;

revoke all on function public.get_users_season_highlight_batch(uuid[], int, text) from public;
grant execute on function public.get_users_season_highlight_batch(uuid[], int, text) to authenticated;

create or replace function public.get_users_yir_viewed_batch(p_user_ids uuid[])
returns table (user_id uuid, last_viewed_year int)
language sql
stable
security definer
set search_path = public
as $$
  select y.user_id, max(y.year)::int as last_viewed_year
  from public.user_year_in_review y
  where y.user_id = any(p_user_ids)
    and y.viewed_at is not null
  group by y.user_id;
$$;

revoke all on function public.get_users_yir_viewed_batch(uuid[]) from public;
grant execute on function public.get_users_yir_viewed_batch(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Owner refresh + YIR viewed (optional flair)
-- ---------------------------------------------------------------------------

create or replace function public.refresh_my_season_summary(p_year int, p_season text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  perform public.generate_user_season_summary(uid, p_year, p_season);
end;
$$;

revoke all on function public.refresh_my_season_summary(int, text) from public;
grant execute on function public.refresh_my_season_summary(int, text) to authenticated;

create or replace function public.refresh_my_year_in_review(p_year int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  perform public.generate_user_year_in_review(uid, p_year);
end;
$$;

revoke all on function public.refresh_my_year_in_review(int) from public;
grant execute on function public.refresh_my_year_in_review(int) to authenticated;

create or replace function public.mark_year_in_review_viewed(p_year int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  update public.user_year_in_review y
  set viewed_at = now()
  where y.user_id = uid and y.year = p_year;
end;
$$;

revoke all on function public.mark_year_in_review_viewed(int) from public;
grant execute on function public.mark_year_in_review_viewed(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Optional scheduled entrypoint (call from Supabase cron / Edge on Jan 1 UTC)
-- ---------------------------------------------------------------------------

create or replace function public.scheduled_generate_year_in_review_for_user(p_user_id uuid, p_year int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.generate_user_year_in_review(p_user_id, p_year);
end;
$$;

revoke all on function public.scheduled_generate_year_in_review_for_user(uuid, int) from public;
grant execute on function public.scheduled_generate_year_in_review_for_user(uuid, int) to service_role;

-- ---------------------------------------------------------------------------
-- Activity log trigger: season boundaries + Jan 1 year wrap
-- ---------------------------------------------------------------------------

create or replace function public.tr_user_activity_season_and_yir()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m int := extract(month from new.activity_date)::int;
  d int := extract(day from new.activity_date)::int;
  y int := extract(year from new.activity_date)::int;
begin
  if d = 1 then
    if m = 3 then
      perform public.generate_user_season_summary(new.user_id, y, 'winter');
    elsif m = 6 then
      perform public.generate_user_season_summary(new.user_id, y, 'spring');
    elsif m = 9 then
      perform public.generate_user_season_summary(new.user_id, y, 'summer');
    elsif m = 12 then
      perform public.generate_user_season_summary(new.user_id, y, 'fall');
    elsif m = 1 then
      perform public.generate_user_year_in_review(new.user_id, y - 1);
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.tr_user_activity_season_and_yir() from public;

drop trigger if exists tr_user_activity_season_yir on public.user_activity_log;
create trigger tr_user_activity_season_yir
  after insert on public.user_activity_log
  for each row execute function public.tr_user_activity_season_and_yir();

notify pgrst, 'reload schema';
