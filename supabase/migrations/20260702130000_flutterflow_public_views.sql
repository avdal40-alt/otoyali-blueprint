-- =============================================================================
-- OTOYALI - FlutterFlow public read views (Sprint 1)
-- Migration: 20260702130000_flutterflow_public_views.sql
-- Scope: public-schema compatibility views for guest browsing
-- =============================================================================

BEGIN;

-- FlutterFlow Basic imports the public schema reliably, so these views are a
-- thin read-only compatibility layer over the vehicle and marketplace domains.

CREATE OR REPLACE VIEW public.ff_home_listings
WITH (security_invoker = true)
AS
SELECT
  l.id AS listing_id,
  l.vehicle_profile_id,
  l.title,
  l.price_amount,
  l.currency::TEXT AS currency,
  l.city,
  l.published_at,
  ma.name AS make_name,
  mo.name AS model_name,
  vp.year,
  vp.mileage_km,
  vp.fuel_type::TEXT AS fuel_type,
  vp.transmission::TEXT AS transmission,
  cover_media.url AS cover_image_url
FROM marketplace.listings l
INNER JOIN vehicle.vehicle_profiles vp ON vp.id = l.vehicle_profile_id
INNER JOIN vehicle.makes ma ON ma.id = vp.make_id
INNER JOIN vehicle.models mo ON mo.id = vp.model_id
LEFT JOIN LATERAL (
  SELECT pm.url
  FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = vp.id
  ORDER BY pm.is_cover DESC, pm.sort_order ASC, pm.created_at ASC
  LIMIT 1
) cover_media ON TRUE
WHERE l.status = 'active'
  AND vp.profile_status = 'active'
  AND ma.is_active = TRUE
  AND mo.is_active = TRUE;

COMMENT ON VIEW public.ff_home_listings IS
  'FlutterFlow public-schema read view for Home/Search listing cards. Exposes active listings only.';

CREATE OR REPLACE VIEW public.ff_listing_details
WITH (security_invoker = true)
AS
SELECT
  l.id AS listing_id,
  l.vehicle_profile_id,
  l.seller_id,
  l.title,
  l.description,
  l.price_amount,
  l.currency::TEXT AS currency,
  l.price_negotiable,
  l.city,
  l.published_at,
  ma.name AS make_name,
  mo.name AS model_name,
  vp.year,
  vp.mileage_km,
  vp.fuel_type::TEXT AS fuel_type,
  vp.transmission::TEXT AS transmission
FROM marketplace.listings l
INNER JOIN vehicle.vehicle_profiles vp ON vp.id = l.vehicle_profile_id
INNER JOIN vehicle.makes ma ON ma.id = vp.make_id
INNER JOIN vehicle.models mo ON mo.id = vp.model_id
WHERE l.status = 'active'
  AND vp.profile_status = 'active'
  AND ma.is_active = TRUE
  AND mo.is_active = TRUE;

COMMENT ON VIEW public.ff_listing_details IS
  'FlutterFlow public-schema read view for active listing details. Does not expose seller profile data.';

CREATE OR REPLACE VIEW public.ff_listing_media
WITH (security_invoker = true)
AS
SELECT
  l.id AS listing_id,
  l.vehicle_profile_id,
  pm.id AS media_id,
  pm.url,
  pm.storage_path,
  pm.sort_order,
  pm.is_cover
FROM marketplace.listings l
INNER JOIN vehicle.vehicle_profiles vp ON vp.id = l.vehicle_profile_id
INNER JOIN vehicle.makes ma ON ma.id = vp.make_id
INNER JOIN vehicle.models mo ON mo.id = vp.model_id
INNER JOIN vehicle.profile_media pm ON pm.vehicle_profile_id = vp.id
WHERE l.status = 'active'
  AND vp.profile_status = 'active'
  AND ma.is_active = TRUE
  AND mo.is_active = TRUE;

COMMENT ON VIEW public.ff_listing_media IS
  'FlutterFlow public-schema read view for media attached to active listings.';

CREATE OR REPLACE VIEW public.ff_makes
WITH (security_invoker = true)
AS
SELECT
  ma.id AS make_id,
  ma.name AS make_name,
  ma.slug AS make_slug
FROM vehicle.makes ma
WHERE ma.is_active = TRUE;

COMMENT ON VIEW public.ff_makes IS
  'FlutterFlow public-schema read view for active vehicle makes.';

CREATE OR REPLACE VIEW public.ff_models
WITH (security_invoker = true)
AS
SELECT
  mo.id AS model_id,
  mo.make_id,
  ma.name AS make_name,
  mo.name AS model_name,
  mo.slug AS model_slug
FROM vehicle.models mo
INNER JOIN vehicle.makes ma ON ma.id = mo.make_id
WHERE mo.is_active = TRUE
  AND ma.is_active = TRUE;

COMMENT ON VIEW public.ff_models IS
  'FlutterFlow public-schema read view for active vehicle models.';

REVOKE ALL ON
  public.ff_home_listings,
  public.ff_listing_details,
  public.ff_listing_media,
  public.ff_makes,
  public.ff_models
FROM PUBLIC;

GRANT SELECT ON
  public.ff_home_listings,
  public.ff_listing_details,
  public.ff_listing_media,
  public.ff_makes,
  public.ff_models
TO anon, authenticated;

COMMIT;
