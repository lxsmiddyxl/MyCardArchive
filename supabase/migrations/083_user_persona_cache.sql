-- Collector persona cache — single-line synthesis for social surfaces.
-- Keep composition thresholds aligned with src/lib/persona/build-persona.ts and persona-rules.ts.

create table if not exists public.user_persona_cache (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  persona_text text not null,
  updated_at timestamptz not null default now()
);

comment on table public.user_persona_cache is
  'Deterministic one-line persona — refreshed server-side only via refresh_user_persona.';

alter table public.user_persona_cache enable row level security;

revoke all on table public.user_persona_cache from public;
revoke all on table public.user_persona_cache from anon;
revoke all on table public.user_persona_cache from authenticated;

grant all on table public.user_persona_cache to service_role;

-- ---------------------------------------------------------------------------
-- Label helpers (mirror TS catalogs — extend when formats/archetypes grow)
-- ---------------------------------------------------------------------------

create or replace function public._persona_format_label(p_format text)
returns text
language sql
immutable
parallel safe
as $$
  select case lower(trim(coalesce(p_format, '')))
    when 'commander' then 'Commander'
    when 'standard' then 'Standard'
    when 'modern' then 'Modern'
    when 'vintage' then 'Vintage'
    when 'pioneer' then 'Pioneer'
    when 'pauper' then 'Pauper'
    when 'legacy' then 'Legacy'
    when 'limited' then 'Limited'
    else null
  end;
$$;

create or replace function public._persona_archetype_label(p_arch text)
returns text
language sql
immutable
parallel safe
as $$
  select case lower(trim(coalesce(p_arch, '')))
    when 'aggro' then 'Aggro'
    when 'control' then 'Control'
    when 'midrange' then 'Midrange'
    when 'combo' then 'Combo'
    when 'tribal' then 'Tribal'
    when 'tempo' then 'Tempo'
    when 'ramp' then 'Ramp'
    when 'stax' then 'Stax'
    when 'burn' then 'Burn'
    else null
  end;
$$;

create or replace function public._persona_era_label(p_era text)
returns text
language sql
immutable
parallel safe
as $$
  select case lower(trim(coalesce(p_era, '')))
    when 'wotc_classic' then 'Wizards Base–Rocket'
    when 'neo_block' then 'Neo'
    when 'ecard_block' then 'e-Card'
    when 'ex_series' then 'EX / ADV'
    when 'diamond_pearl' then 'Diamond & Pearl'
    when 'hgss_era' then 'HeartGold SoulSilver'
    when 'black_white_bw' then 'Black & White'
    when 'xy_mega_ex' then 'XY / Mega EX'
    when 'sun_moon_gx' then 'Sun & Moon GX'
    when 'sword_shield' then 'Sword & Shield'
    when 'scarlet_violet' then 'Scarlet & Violet'
    when 'jumbo_promo' then 'Jumbo / promo eras'
    when 'legendary_collections' then 'Legendary Collections'
    when 'platinum_arc' then 'Platinum / SP'
    when 'call_legends_wave' then 'Call of Legends HS'
    else null
  end;
$$;

create or replace function public._persona_character_label(p_char text)
returns text
language sql
immutable
parallel safe
as $$
  select case lower(trim(coalesce(p_char, '')))
    when 'charizard_line' then 'Charizard line'
    when 'pikachu_mascots' then 'Pikachu cosplay tribe'
    when 'eevee_lab' then 'Eeveelutions'
    when 'lucario_myth' then 'Lucario lineage'
    when 'gengar_mischief' then 'Gengar & ghosts'
    when 'dragon_tcg' then 'Dragons'
    when 'fossils' then 'Fossils'
    when 'mew_mythic' then 'Mew lineage'
    when 'ray_quaza_story' then 'Rayquaza / weather trio'
    when 'umbreon_espeon' then 'Umbreon × Espeon'
    when 'gardevoir_fan' then 'Gardevoir / Ralts line'
    when 'lugia_hooh_arcs' then 'Lugia / Ho-Oh arcs'
    else null
  end;
$$;

create or replace function public._persona_artist_label(p_art text)
returns text
language sql
immutable
parallel safe
as $$
  select case lower(trim(coalesce(p_art, '')))
    when 'mitsuhiro_arita' then 'Mitsuhiro Arita'
    when 'ken_sugimori' then 'Ken Sugimori'
    when 'kouichi_oyama' then 'Kouichi Ooyama'
    when 'yuka_morisawa' then 'Yuka Morii'
    when 'sui_artist' then 'SUI'
    when 'kagemaru_himeno' then 'Kagemaru Himeno'
    when 'naoki_saito' then 'Naoki Saito'
    when 'sowsow' then 'sowsow'
    else null
  end;
$$;

create or replace function public._persona_theme_label(p_theme text)
returns text
language sql
immutable
parallel safe
as $$
  select case lower(trim(coalesce(p_theme, '')))
    when 'full_art' then 'full art Trainer / Pokémon'
    when 'alt_art_secret' then 'alt art secrets'
    when 'special_illustration' then 'special illustration rare'
    when 'rainbow_full' then 'rainbow rare'
    when 'gold_secret' then 'gold secret cards'
    when 'vmax_gx_block' then 'VMAX / GX focus'
    when 'vstar_mechanics' then 'VSTAR / radiant'
    else null
  end;
$$;

create or replace function public._persona_set_label(p_set text)
returns text
language sql
immutable
parallel safe
as $$
  select case lower(trim(coalesce(p_set, '')))
    when 'base1' then 'Base Set'
    when 'neo1' then 'Neo Genesis'
    when 'ex1' then 'Ruby & Sapphire (EX)'
    when 'sv1' then 'Scarlet & Violet'
    when 'swsh1' then 'Sword & Shield'
    when 'sm1' then 'Sun & Moon'
    when 'xy1' then 'XY'
    when 'bw1' then 'Black & White'
    else null
  end;
$$;

-- ---------------------------------------------------------------------------
-- Core refresh (reads identity tables only — never writes badges)
-- ---------------------------------------------------------------------------

create or replace function public.refresh_user_persona(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fmt text;
  v_arch text;
  v_fmt_l text;
  v_arch_l text;
  v_nucleus text;
  v_fan text;
  v_est bigint;
  v_total int;
  v_unique int;
  v_hi int;
  v_val text;
  v_mb int;
  v_ms int;
  v_mas text;
  v_tc int;
  v_pos int;
  v_neu int;
  v_neg int;
  v_ratio numeric;
  v_tier text;
  v_trade text;
  v_journey text;
  v_season text;
  v_line text;
  v_favorite_set text;
  v_favorite_era text;
  v_favorite_artist text;
  v_favorite_character text;
  v_favorite_theme text;
  v_era_disp text;
  v_char_disp text;
  v_theme_disp text;
  v_set_disp text;
  v_art_disp text;
  v_hi_ratio numeric;
  v_uq_ratio numeric;
  v_rp text;
  v_badge text;
begin
  if p_user_id is null then
    return;
  end if;

  select favorite_format_id, favorite_archetype_id
    into v_fmt, v_arch
  from public.user_play_identity
  where user_id = p_user_id;

  v_fmt_l := public._persona_format_label(v_fmt);
  v_arch_l := public._persona_archetype_label(v_arch);

  if v_fmt_l is not null and v_arch_l is not null then
    v_nucleus := v_fmt_l || '-leaning ' || v_arch_l || ' tactician';
  elsif v_fmt_l is not null then
    v_nucleus := v_fmt_l || ' specialist';
  elsif v_arch_l is not null then
    v_nucleus := v_arch_l || '-style deckbuilder';
  else
    v_nucleus := null;
  end if;

  select
    favorite_set_id,
    favorite_era_id,
    favorite_artist_id,
    favorite_character_id,
    favorite_theme_id
  into
    v_favorite_set,
    v_favorite_era,
    v_favorite_artist,
    v_favorite_character,
    v_favorite_theme
  from public.user_fandom_identity
  where user_id = p_user_id;

  v_era_disp := public._persona_era_label(v_favorite_era);
  v_char_disp := public._persona_character_label(v_favorite_character);
  v_art_disp := public._persona_artist_label(v_favorite_artist);
  v_theme_disp := public._persona_theme_label(v_favorite_theme);
  v_set_disp := public._persona_set_label(v_favorite_set);

  if v_era_disp is not null and v_char_disp is not null then
    v_fan := 'drawn to ' || v_era_disp || ' ' || lower(v_char_disp);
  elsif v_era_disp is not null then
    v_fan := 'with nostalgia for the ' || v_era_disp || ' era';
  elsif v_char_disp is not null then
    v_fan := 'focused on ' || lower(v_char_disp);
  elsif v_art_disp is not null then
    v_fan := 'devoted to ' || v_art_disp || '''s artwork';
  elsif v_theme_disp is not null then
    v_fan := 'who favors ' || v_theme_disp || ' finishes';
  elsif v_set_disp is not null then
    v_fan := 'who keeps returning to ' || v_set_disp;
  else
    v_fan := null;
  end if;

  select
    estimated_value_cents,
    total_cards,
    unique_cards,
    high_rarity_count
  into v_est, v_total, v_unique, v_hi
  from public.user_collection_value_cache
  where user_id = p_user_id;

  v_val := null;
  if v_total is not null and coalesce(v_total, 0) > 0 then
    v_hi_ratio := (coalesce(v_hi, 0))::numeric / greatest(v_total, 1)::numeric;
    v_uq_ratio := (coalesce(v_unique, 0))::numeric / greatest(v_total, 1)::numeric;
    if v_hi_ratio >= 0.12 then
      v_rp := 'High-rarity heavy';
    elsif v_uq_ratio >= 0.85 and v_total > 40 then
      v_rp := 'Unique-focused';
    elsif v_total > 200 and v_hi_ratio < 0.04 then
      v_rp := 'Bulk-focused';
    else
      v_rp := 'Balanced';
    end if;

    if coalesce(v_est, 0) >= 100000 then
      v_badge := 'high_value_collector';
    elsif coalesce(v_hi, 0) >= 25 then
      v_badge := 'rarity_hunter';
    elsif coalesce(v_unique, 0) >= 250 then
      v_badge := 'unique_collector';
    else
      v_badge := null;
    end if;

    if v_badge = 'high_value_collector' or coalesce(v_est, 0) >= 100000 then
      v_val := 'with a binder tilt toward premium singles (approximate estimates only)';
    elsif v_badge = 'rarity_hunter' then
      v_val := 'who chases high-rarity hits';
    elsif v_badge = 'unique_collector' then
      v_val := 'who prioritizes broad variety across the binder';
    elsif v_rp = 'High-rarity heavy' then
      v_val := 'with a rarity-heavy mix';
    elsif v_rp = 'Unique-focused' then
      v_val := 'with a distinct-card lean';
    elsif v_rp = 'Bulk-focused' then
      v_val := 'who enjoys deep bulk and commons grids';
    elsif v_rp = 'Balanced' then
      v_val := 'with a balanced binder profile';
    end if;
  end if;

  select
    count(*) filter (where mastery_type = 'binder' and is_complete),
    count(*) filter (where mastery_type = 'set' and is_complete)
  into v_mb, v_ms
  from public.user_collection_mastery
  where user_id = p_user_id;

  if coalesce(v_mb, 0) > 0 and coalesce(v_ms, 0) > 0 then
    v_mas := 'who clears binder and set mastery milestones';
  elsif coalesce(v_mb, 0) > 0 then
    v_mas := 'who pushes binder mastery goals';
  elsif coalesce(v_ms, 0) > 0 then
    v_mas := 'who targets set completion milestones';
  else
    v_mas := null;
  end if;

  select
    completed_trades_count,
    positive_feedback_count,
    neutral_feedback_count,
    negative_feedback_count
  into v_tc, v_pos, v_neu, v_neg
  from public.user_trade_reputation
  where user_id = p_user_id;

  select tier_slug into v_tier
  from public.social_public_profiles
  where user_id = p_user_id;

  v_trade := null;
  if coalesce(v_tc, 0) > 0 then
    v_ratio := (coalesce(v_pos, 0))::numeric / greatest(v_tc, 1)::numeric;
    if lower(trim(coalesce(v_tier, ''))) = 'business'
       and v_tc >= 20
       and v_ratio >= 0.90 then
      v_trade := 'recognized among traders as a reliable shop-front presence';
    elsif v_tc >= 50 then
      v_trade := 'seasoned by deep marketplace history';
    elsif v_tc >= 10 and v_ratio >= 0.85 then
      v_trade := 'recognized among trainers as a trusted trader';
    end if;
  end if;

  select j.journey_id into v_journey
  from public.user_journey_progress j
  where j.user_id = p_user_id
    and j.is_complete
  order by
    case j.journey_id
      when 'first_500_scans' then 500
      when 'first_50_scans' then 50
      when 'ten_unique_sets' then 10
      when 'seven_day_streak' then 7
      else 1
    end desc,
    j.journey_id asc
  limit 1;

  if v_journey is not null then
    v_journey := case v_journey
      when 'first_500_scans' then 'guided by milestones like scan 500 cards'
      when 'first_50_scans' then 'guided by milestones like scan 50 cards'
      when 'ten_unique_sets' then 'guided by milestones like log 10 unique sets'
      when 'seven_day_streak' then 'guided by milestones like reach a 7-day streak'
      when 'first_binder_complete' then 'guided by milestones like complete your first binder'
      when 'first_seasonal_badge' then 'guided by milestones like earn your first seasonal badge'
      when 'thousand_reputation' then 'guided by milestones like reach 1,000 reputation'
      else null
    end;
  end if;

  select b.badge_key into v_season
  from public.user_badges b
  where b.user_id = p_user_id
    and b.badge_type = 'seasonal_event'
  order by
    case b.badge_key
      when 'holiday_2026_collector' then 3
      when 'summer_2026_scan_sprint' then 2
      when 'spring_2026_collector' then 1
      else 0
    end desc
  limit 1;

  v_season := case v_season
    when 'spring_2026_collector' then 'seasonally tuned like a spring collector sprint'
    when 'summer_2026_scan_sprint' then 'fresh off a summer scan sprint mindset'
    when 'holiday_2026_collector' then 'carrying year-end holiday collector energy'
    else null
  end;

  if v_nucleus is null then
    v_nucleus := 'collector';
  end if;

  if lower(trim(v_nucleus)) = 'collector'
     and v_fan is null
     and v_val is null
     and v_mas is null
     and v_trade is null
     and v_journey is null
     and v_season is null then
    v_line := 'A Pokémon TCG collector shaping their archive one binder at a time.';
  else
    v_line :=
      case when substr(trim(v_nucleus), 1, 1) in ('A','E','I','O','U','a','e','i','o','u')
        then 'An ' else 'A ' end
      || trim(v_nucleus);

    if v_fan is not null then v_line := v_line || ', ' || v_fan; end if;
    if v_val is not null then v_line := v_line || ', ' || v_val; end if;
    if v_mas is not null then v_line := v_line || ', ' || v_mas; end if;
    if v_trade is not null then v_line := v_line || ', ' || v_trade; end if;
    if v_journey is not null then v_line := v_line || ', ' || v_journey; end if;
    if v_season is not null then v_line := v_line || ', ' || v_season; end if;

    if right(trim(v_line), 1) <> '.' then
      v_line := trim(v_line) || '.';
    end if;
  end if;

  insert into public.user_persona_cache (user_id, persona_text, updated_at)
  values (p_user_id, v_line, now())
  on conflict (user_id) do update set
    persona_text = excluded.persona_text,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.refresh_user_persona(uuid) from public;
grant execute on function public.refresh_user_persona(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- RPC reads (batch for enrichment)
-- ---------------------------------------------------------------------------

create or replace function public.get_user_persona(p_user_id uuid)
returns table (
  user_id uuid,
  persona_text text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, c.persona_text, c.updated_at
  from (select p_user_id as user_id) as p
  left join public.user_persona_cache c on c.user_id = p.user_id;
$$;

revoke all on function public.get_user_persona(uuid) from public;
grant execute on function public.get_user_persona(uuid) to authenticated;

create or replace function public.get_users_persona_batch(p_user_ids uuid[])
returns table (
  user_id uuid,
  persona_text text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.uid as user_id,
    c.persona_text,
    c.updated_at
  from unnest(p_user_ids) as u(uid)
  left join public.user_persona_cache c on c.user_id = u.uid;
$$;

revoke all on function public.get_users_persona_batch(uuid[]) from public;
grant execute on function public.get_users_persona_batch(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers — refresh persona when identity signals change (no badge writes here)
-- ---------------------------------------------------------------------------

create or replace function public.tr_user_persona_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := coalesce(new.user_id, old.user_id);
  if uid is null then
    return coalesce(new, old);
  end if;
  perform public.refresh_user_persona(uid);
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_user_persona_play on public.user_play_identity;
create trigger tr_user_persona_play
  after insert or update on public.user_play_identity
  for each row execute function public.tr_user_persona_refresh();

drop trigger if exists tr_user_persona_fandom on public.user_fandom_identity;
create trigger tr_user_persona_fandom
  after insert or update on public.user_fandom_identity
  for each row execute function public.tr_user_persona_refresh();

drop trigger if exists tr_user_persona_value on public.user_collection_value_cache;
create trigger tr_user_persona_value
  after insert or update on public.user_collection_value_cache
  for each row execute function public.tr_user_persona_refresh();

drop trigger if exists tr_user_persona_mastery on public.user_collection_mastery;
create trigger tr_user_persona_mastery
  after insert or update on public.user_collection_mastery
  for each row execute function public.tr_user_persona_refresh();

drop trigger if exists tr_user_persona_trade on public.user_trade_reputation;
create trigger tr_user_persona_trade
  after insert or update on public.user_trade_reputation
  for each row execute function public.tr_user_persona_refresh();

drop trigger if exists tr_user_persona_journey on public.user_journey_progress;
create trigger tr_user_persona_journey
  after insert or update on public.user_journey_progress
  for each row execute function public.tr_user_persona_refresh();

drop trigger if exists tr_user_persona_profile on public.social_public_profiles;
create trigger tr_user_persona_profile
  after insert or update of tier_slug on public.social_public_profiles
  for each row execute function public.tr_user_persona_refresh();

create or replace function public.tr_user_persona_seasonal_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.badge_type = 'seasonal_event' then
    perform public.refresh_user_persona(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists tr_user_persona_seasonal on public.user_badges;
create trigger tr_user_persona_seasonal
  after insert on public.user_badges
  for each row
  when (new.badge_type = 'seasonal_event')
  execute function public.tr_user_persona_seasonal_badge();
