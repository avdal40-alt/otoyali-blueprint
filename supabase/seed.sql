-- =============================================================================
-- OTOYALI - Sprint 1 demo seed data
-- Scope: vehicle catalog and active marketplace listings for Home/Search demos
-- =============================================================================

BEGIN;

-- Fixed UUIDs keep this seed safe to re-run during local resets.

-- ---------------------------------------------------------------------------
-- Support seller profile required by vehicle/listing foreign keys
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  phone,
  phone_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000101',
  'authenticated',
  'authenticated',
  '+905551234567',
  NOW(),
  '{"provider":"phone","providers":["phone"]}'::JSONB,
  '{"language":"tr","country":"TR","timezone":"Europe/Istanbul"}'::JSONB,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  phone = EXCLUDED.phone,
  phone_confirmed_at = EXCLUDED.phone_confirmed_at,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

INSERT INTO public.profiles (
  id,
  phone,
  first_name,
  last_name,
  language,
  country,
  city,
  timezone
)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  '+905551234567',
  'Demo',
  'Seller',
  'tr',
  'TR',
  'Istanbul',
  'Europe/Istanbul'
)
ON CONFLICT (id) DO UPDATE
SET
  phone = EXCLUDED.phone,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  language = EXCLUDED.language,
  country = EXCLUDED.country,
  city = EXCLUDED.city,
  timezone = EXCLUDED.timezone;

-- ---------------------------------------------------------------------------
-- vehicle.makes
-- ---------------------------------------------------------------------------

INSERT INTO vehicle.makes (id, name, slug, is_active)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'BMW', 'bmw', TRUE),
  ('10000000-0000-0000-0000-000000000002', 'Mercedes-Benz', 'mercedes-benz', TRUE),
  ('10000000-0000-0000-0000-000000000003', 'Audi', 'audi', TRUE),
  ('10000000-0000-0000-0000-000000000004', 'Toyota', 'toyota', TRUE),
  ('10000000-0000-0000-0000-000000000005', 'Honda', 'honda', TRUE),
  ('10000000-0000-0000-0000-000000000006', 'Hyundai', 'hyundai', TRUE),
  ('10000000-0000-0000-0000-000000000007', 'Volkswagen', 'volkswagen', TRUE),
  ('10000000-0000-0000-0000-000000000008', 'Tesla', 'tesla', TRUE)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- vehicle.models
-- ---------------------------------------------------------------------------

WITH model_seed (id, make_slug, name, slug) AS (
  VALUES
    ('11000000-0000-0000-0000-000000000001'::UUID, 'bmw', '3 Series', '3-series'),
    ('11000000-0000-0000-0000-000000000002'::UUID, 'bmw', '5 Series', '5-series'),
    ('11000000-0000-0000-0000-000000000003'::UUID, 'mercedes-benz', 'C-Class', 'c-class'),
    ('11000000-0000-0000-0000-000000000004'::UUID, 'mercedes-benz', 'E-Class', 'e-class'),
    ('11000000-0000-0000-0000-000000000005'::UUID, 'audi', 'A3', 'a3'),
    ('11000000-0000-0000-0000-000000000006'::UUID, 'audi', 'A4', 'a4'),
    ('11000000-0000-0000-0000-000000000007'::UUID, 'toyota', 'Corolla', 'corolla'),
    ('11000000-0000-0000-0000-000000000008'::UUID, 'toyota', 'C-HR', 'c-hr'),
    ('11000000-0000-0000-0000-000000000009'::UUID, 'honda', 'Civic', 'civic'),
    ('11000000-0000-0000-0000-000000000010'::UUID, 'honda', 'City', 'city'),
    ('11000000-0000-0000-0000-000000000011'::UUID, 'hyundai', 'i20', 'i20'),
    ('11000000-0000-0000-0000-000000000012'::UUID, 'hyundai', 'Tucson', 'tucson'),
    ('11000000-0000-0000-0000-000000000013'::UUID, 'volkswagen', 'Golf', 'golf'),
    ('11000000-0000-0000-0000-000000000014'::UUID, 'volkswagen', 'Passat', 'passat'),
    ('11000000-0000-0000-0000-000000000015'::UUID, 'tesla', 'Model 3', 'model-3'),
    ('11000000-0000-0000-0000-000000000016'::UUID, 'tesla', 'Model Y', 'model-y')
)
INSERT INTO vehicle.models (id, make_id, name, slug, is_active)
SELECT
  model_seed.id,
  vehicle.makes.id,
  model_seed.name,
  model_seed.slug,
  TRUE
FROM model_seed
INNER JOIN vehicle.makes ON vehicle.makes.slug = model_seed.make_slug
ON CONFLICT (make_id, slug) DO UPDATE
SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- vehicle.vehicle_profiles
-- ---------------------------------------------------------------------------

WITH profile_seed (
  id,
  make_slug,
  model_slug,
  year,
  mileage_km,
  fuel_type,
  transmission,
  body_type
) AS (
  VALUES
    ('20000000-0000-0000-0000-000000000001'::UUID, 'bmw', '3-series', 2021, 48000, 'gasoline', 'automatic', 'Sedan'),
    ('20000000-0000-0000-0000-000000000002'::UUID, 'mercedes-benz', 'c-class', 2020, 62000, 'diesel', 'automatic', 'Sedan'),
    ('20000000-0000-0000-0000-000000000003'::UUID, 'audi', 'a3', 2019, 74000, 'gasoline', 'automatic', 'Hatchback'),
    ('20000000-0000-0000-0000-000000000004'::UUID, 'toyota', 'corolla', 2022, 36000, 'hybrid', 'automatic', 'Sedan'),
    ('20000000-0000-0000-0000-000000000005'::UUID, 'hyundai', 'tucson', 2021, 55000, 'diesel', 'automatic', 'SUV'),
    ('20000000-0000-0000-0000-000000000006'::UUID, 'tesla', 'model-3', 2023, 18000, 'electric', 'automatic', 'Sedan')
)
INSERT INTO vehicle.vehicle_profiles (
  id,
  make_id,
  model_id,
  year,
  mileage_km,
  fuel_type,
  transmission,
  body_type,
  created_source,
  profile_status,
  created_by
)
SELECT
  profile_seed.id,
  vehicle.makes.id,
  vehicle.models.id,
  profile_seed.year,
  profile_seed.mileage_km,
  profile_seed.fuel_type::vehicle.fuel_type,
  profile_seed.transmission::vehicle.transmission_type,
  profile_seed.body_type,
  'manual'::vehicle.created_source,
  'active'::vehicle.profile_status,
  '00000000-0000-0000-0000-000000000101'
FROM profile_seed
INNER JOIN vehicle.makes ON vehicle.makes.slug = profile_seed.make_slug
INNER JOIN vehicle.models
  ON vehicle.models.make_id = vehicle.makes.id
  AND vehicle.models.slug = profile_seed.model_slug
ON CONFLICT (id) DO UPDATE
SET
  make_id = EXCLUDED.make_id,
  model_id = EXCLUDED.model_id,
  year = EXCLUDED.year,
  mileage_km = EXCLUDED.mileage_km,
  fuel_type = EXCLUDED.fuel_type,
  transmission = EXCLUDED.transmission,
  body_type = EXCLUDED.body_type,
  created_source = EXCLUDED.created_source,
  profile_status = EXCLUDED.profile_status,
  created_by = EXCLUDED.created_by;

-- ---------------------------------------------------------------------------
-- vehicle.profile_ownership
-- ---------------------------------------------------------------------------

INSERT INTO vehicle.profile_ownership (
  id,
  vehicle_profile_id,
  owner_id,
  ownership_type,
  is_current
)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'owner', TRUE),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000101', 'owner', TRUE),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000101', 'owner', TRUE),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000101', 'owner', TRUE),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000101', 'owner', TRUE),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000101', 'owner', TRUE)
ON CONFLICT (vehicle_profile_id) WHERE is_current = TRUE DO UPDATE
SET
  owner_id = EXCLUDED.owner_id,
  ownership_type = EXCLUDED.ownership_type,
  ended_at = NULL;

-- ---------------------------------------------------------------------------
-- vehicle.profile_media
-- ---------------------------------------------------------------------------

INSERT INTO vehicle.profile_media (
  id,
  vehicle_profile_id,
  storage_path,
  url,
  sort_order,
  is_cover
)
VALUES
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'demo/bmw-3-series-cover.jpg', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80', 0, TRUE),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'demo/mercedes-c-class-cover.jpg', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80', 0, TRUE),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'demo/audi-a3-cover.jpg', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80', 0, TRUE),
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'demo/toyota-corolla-cover.jpg', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80', 0, TRUE),
  ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'demo/hyundai-tucson-cover.jpg', 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=1200&q=80', 0, TRUE),
  ('40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', 'demo/tesla-model-3-cover.jpg', 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80', 0, TRUE)
ON CONFLICT (vehicle_profile_id) WHERE is_cover = TRUE DO UPDATE
SET
  storage_path = EXCLUDED.storage_path,
  url = EXCLUDED.url,
  sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- marketplace.listings
-- ---------------------------------------------------------------------------

INSERT INTO marketplace.listings (
  id,
  vehicle_profile_id,
  seller_id,
  status,
  title,
  description,
  price_amount,
  currency,
  price_negotiable,
  city,
  published_at
)
VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'active',
    '2021 BMW 320i M Sport',
    'Bakimli, otomatik vites, dusuk kilometreli Istanbul araci.',
    2350000,
    'TRY',
    TRUE,
    'Istanbul',
    NOW() - INTERVAL '6 days'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000101',
    'active',
    '2020 Mercedes-Benz C 200d AMG',
    'Yetkili servis bakimli, dizel otomatik, temiz aile araci.',
    2650000,
    'TRY',
    TRUE,
    'Ankara',
    NOW() - INTERVAL '5 days'
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000101',
    'active',
    '2019 Audi A3 Sportback',
    'Sehir ici kullanim icin ideal, otomatik, benzinli hatchback.',
    1450000,
    'TRY',
    TRUE,
    'Izmir',
    NOW() - INTERVAL '4 days'
  ),
  (
    '50000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000101',
    'active',
    '2022 Toyota Corolla Hybrid Flame X-Pack',
    'Ekonomik hybrid, hatasiz, servis kayitli.',
    1585000,
    'TRY',
    FALSE,
    'Antalya',
    NOW() - INTERVAL '3 days'
  ),
  (
    '50000000-0000-0000-0000-000000000005',
    '20000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000101',
    'active',
    '2021 Hyundai Tucson Elite Plus',
    'Genis aile SUV, dizel otomatik, zengin donanim.',
    1925000,
    'TRY',
    TRUE,
    'Istanbul',
    NOW() - INTERVAL '2 days'
  ),
  (
    '50000000-0000-0000-0000-000000000006',
    '20000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000101',
    'active',
    '2023 Tesla Model 3 Long Range',
    'Elektrikli, dusuk kilometreli, cam tavanli Long Range.',
    2890000,
    'TRY',
    TRUE,
    'Ankara',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO UPDATE
SET
  vehicle_profile_id = EXCLUDED.vehicle_profile_id,
  seller_id = EXCLUDED.seller_id,
  status = EXCLUDED.status,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_amount = EXCLUDED.price_amount,
  currency = EXCLUDED.currency,
  price_negotiable = EXCLUDED.price_negotiable,
  city = EXCLUDED.city,
  published_at = EXCLUDED.published_at;

COMMIT;
