-- Local dev seed: public deck + cards for viewer, API, OG image, and RLS/RPC smoke tests.
-- Adapted to this schema (UUIDs, deck_cards.section, cards require binder_id/user_id,
-- analytics on public.decks; deck_stats holds counts/color_identity only).

-- 1. Test auth user
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000100',
  'test@example.com',
  '00000000-0000-0000-0000-000000000001',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'test@example.com'),
  'email',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

-- 2. Profile: add username/email for get_public_deck_owner_display; upsert display fields.
-- In one DO block so ALTER runs before INSERT is planned (Supabase seed parses statements first).
do $seed_profiles$
begin
  alter table public.profiles add column if not exists username text;
  alter table public.profiles add column if not exists email text;
  insert into public.profiles (id, username, email)
  values ('00000000-0000-0000-0000-000000000001', 'TestUser', 'test@example.com')
  on conflict (id) do update
  set username = excluded.username,
      email = excluded.email;
end $seed_profiles$;

-- Tier row (deck limit trigger reads user_tiers)
insert into public.user_tiers (
  user_id,
  tier_slug,
  binder_limit,
  card_limit,
  scan_limit
)
values (
  '00000000-0000-0000-0000-000000000001',
  'pro',
  10,
  5000,
  500
)
on conflict (user_id) do update
set tier_slug = excluded.tier_slug,
    binder_limit = excluded.binder_limit,
    card_limit = excluded.card_limit,
    scan_limit = excluded.scan_limit;

-- Binder required for cards
insert into public.binders (id, user_id, name)
values (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000001',
  'Seed Binder'
)
on conflict (id) do nothing;

-- 3. Minimal user cards (UUIDs)
insert into public.cards (id, binder_id, user_id, name, number, rarity, image_url)
values
  (
    '33333333-3333-3333-3333-333333333331',
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'Test Card One',
    '1',
    'common',
    'https://picsum.photos/seed/mca1/300/420'
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'Test Card Two',
    '2',
    'rare',
    'https://picsum.photos/seed/mca2/300/420'
  )
on conflict (id) do nothing;

-- 4. Public test deck
insert into public.decks (
  id,
  user_id,
  name,
  description,
  format,
  is_public
)
values (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  'Sample Public Deck',
  'Seed deck for local development.',
  'standard',
  true
)
on conflict (id) do nothing;

-- 5. Deck list (MAIN uses section 'main')
insert into public.deck_cards (deck_id, card_id, quantity, section)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333331',
    4,
    'main'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333332',
    2,
    'main'
  )
on conflict (deck_id, card_id, section) do nothing;

-- 6. Deck analytics (stored on public.decks)
update public.decks
set
  type_distribution = '{"creature": 4, "spell": 2}'::jsonb,
  rarity_distribution = '{"common": 4, "rare": 2}'::jsonb,
  set_distribution = '{"Test Set": 6}'::jsonb,
  estimated_value = 12.50,
  top_cards = jsonb_build_array(
    jsonb_build_object(
      'id',
      '33333333-3333-3333-3333-333333333331',
      'name',
      'Test Card One',
      'image_url',
      'https://picsum.photos/seed/mca1/300/420',
      'price',
      5.00
    ),
    jsonb_build_object(
      'id',
      '33333333-3333-3333-3333-333333333332',
      'name',
      'Test Card Two',
      'image_url',
      'https://picsum.photos/seed/mca2/300/420',
      'price',
      7.50
    )
  )
where id = '11111111-1111-1111-1111-111111111111';

-- 7. deck_stats row (created by trigger; refresh aggregates for viewer)
update public.deck_stats
set
  total_cards = 6,
  unique_cards = 2,
  color_identity = array['G', 'R']::text[],
  legality_status = 'unknown',
  synergy_score = 0
where deck_id = '11111111-1111-1111-1111-111111111111';
