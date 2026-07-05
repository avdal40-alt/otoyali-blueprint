-- =============================================================================
-- OTOYALI - WEB-05 marketplace search and conversion support
-- Migration: 20260704120000_web05_marketplace_search_conversion.sql
-- Scope: additive fields, saved searches, and backward-compatible public views
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Optional marketplace fields for richer search/display.
-- Existing listing data remains valid; new fields are nullable unless noted.
-- ---------------------------------------------------------------------------

ALTER TABLE vehicle.vehicle_profiles
  ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'used',
  ADD COLUMN IF NOT EXISTS drive_type TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS engine_volume_l NUMERIC(4, 1),
  ADD COLUMN IF NOT EXISTS damage_state TEXT,
  ADD COLUMN IF NOT EXISTS owner_count SMALLINT;

ALTER TABLE marketplace.listings
  ADD COLUMN IF NOT EXISTS seller_type TEXT DEFAULT 'private';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_profiles_condition_chk'
  ) THEN
    ALTER TABLE vehicle.vehicle_profiles
      ADD CONSTRAINT vehicle_profiles_condition_chk
      CHECK (condition IS NULL OR condition IN ('used', 'new'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_profiles_drive_type_chk'
  ) THEN
    ALTER TABLE vehicle.vehicle_profiles
      ADD CONSTRAINT vehicle_profiles_drive_type_chk
      CHECK (drive_type IS NULL OR drive_type IN ('front', 'rear', 'awd'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_profiles_color_not_empty_chk'
  ) THEN
    ALTER TABLE vehicle.vehicle_profiles
      ADD CONSTRAINT vehicle_profiles_color_not_empty_chk
      CHECK (color IS NULL OR char_length(trim(color)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_profiles_engine_volume_chk'
  ) THEN
    ALTER TABLE vehicle.vehicle_profiles
      ADD CONSTRAINT vehicle_profiles_engine_volume_chk
      CHECK (engine_volume_l IS NULL OR engine_volume_l > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_profiles_damage_state_chk'
  ) THEN
    ALTER TABLE vehicle.vehicle_profiles
      ADD CONSTRAINT vehicle_profiles_damage_state_chk
      CHECK (damage_state IS NULL OR damage_state IN ('unknown', 'none', 'minor', 'major'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_profiles_owner_count_chk'
  ) THEN
    ALTER TABLE vehicle.vehicle_profiles
      ADD CONSTRAINT vehicle_profiles_owner_count_chk
      CHECK (owner_count IS NULL OR owner_count > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_seller_type_chk'
  ) THEN
    ALTER TABLE marketplace.listings
      ADD CONSTRAINT listings_seller_type_chk
      CHECK (seller_type IS NULL OR seller_type IN ('private', 'dealer'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS vehicle_profiles_condition_idx
  ON vehicle.vehicle_profiles (condition);

CREATE INDEX IF NOT EXISTS vehicle_profiles_body_type_idx
  ON vehicle.vehicle_profiles (body_type);

CREATE INDEX IF NOT EXISTS vehicle_profiles_drive_type_idx
  ON vehicle.vehicle_profiles (drive_type);

CREATE INDEX IF NOT EXISTS listings_seller_type_idx
  ON marketplace.listings (seller_type);

-- ---------------------------------------------------------------------------
-- Saved searches
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketplace.saved_searches (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT,
  query_params JSONB       NOT NULL DEFAULT '{}'::JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT saved_searches_title_not_empty_chk
    CHECK (title IS NULL OR char_length(trim(title)) > 0),

  CONSTRAINT saved_searches_query_params_object_chk
    CHECK (jsonb_typeof(query_params) = 'object')
);

COMMENT ON TABLE marketplace.saved_searches IS
  'Authenticated-user saved marketplace searches. Notifications are intentionally not implemented in WEB-05.';

CREATE INDEX IF NOT EXISTS saved_searches_user_created_idx
  ON marketplace.saved_searches (user_id, created_at DESC);

DROP TRIGGER IF EXISTS saved_searches_set_updated_at ON marketplace.saved_searches;
CREATE TRIGGER saved_searches_set_updated_at
  BEFORE UPDATE ON marketplace.saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

ALTER TABLE marketplace.saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_searches_select_own ON marketplace.saved_searches;
CREATE POLICY saved_searches_select_own
  ON marketplace.saved_searches
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS saved_searches_insert_own ON marketplace.saved_searches;
CREATE POLICY saved_searches_insert_own
  ON marketplace.saved_searches
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS saved_searches_update_own ON marketplace.saved_searches;
CREATE POLICY saved_searches_update_own
  ON marketplace.saved_searches
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS saved_searches_delete_own ON marketplace.saved_searches;
CREATE POLICY saved_searches_delete_own
  ON marketplace.saved_searches
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS saved_searches_service_role_all ON marketplace.saved_searches;
CREATE POLICY saved_searches_service_role_all
  ON marketplace.saved_searches
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

GRANT SELECT, INSERT, UPDATE, DELETE ON marketplace.saved_searches TO authenticated;
GRANT ALL ON marketplace.saved_searches TO service_role;

-- ---------------------------------------------------------------------------
-- FlutterFlow/web public views.
-- Existing selected columns remain; WEB-05 adds nullable compatibility fields.
-- ---------------------------------------------------------------------------

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
  cover_media.url AS cover_image_url,
  COALESCE(media_stats.media_count, 0) AS media_count,
  l.price_negotiable,
  vp.body_type,
  COALESCE(vp.condition, 'used') AS condition,
  l.seller_type,
  vp.drive_type,
  vp.color,
  vp.engine_volume_l,
  vp.damage_state,
  vp.owner_count
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
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INT AS media_count
  FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = vp.id
) media_stats ON TRUE
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
  vp.transmission::TEXT AS transmission,
  cover_media.url AS cover_image_url,
  COALESCE(media_stats.media_count, 0) AS media_count,
  vp.body_type,
  COALESCE(vp.condition, 'used') AS condition,
  l.seller_type,
  vp.drive_type,
  vp.color,
  vp.engine_volume_l,
  vp.damage_state,
  vp.owner_count
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
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INT AS media_count
  FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = vp.id
) media_stats ON TRUE
WHERE l.status = 'active'
  AND vp.profile_status = 'active'
  AND ma.is_active = TRUE
  AND mo.is_active = TRUE;

COMMENT ON VIEW public.ff_listing_details IS
  'FlutterFlow public-schema read view for active listing details. Does not expose seller profile data.';

GRANT SELECT ON
  public.ff_home_listings,
  public.ff_listing_details
TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
