-- =============================================================================
-- OTOYALI - WEB-06 real listing publishing and quality foundation
-- Migration: 20260706130000_web06_listing_publish_quality.sql
-- Scope: additive seller profile fields, listing quality metadata, media metadata,
--        listing-media storage bucket, and public view compatibility.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Profile fields used by seller publishing.
-- Existing first_name/last_name/phone/city fields remain supported.
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS seller_type TEXT DEFAULT 'private';

UPDATE public.profiles
SET
  full_name = COALESCE(
    NULLIF(trim(full_name), ''),
    NULLIF(trim(concat_ws(' ', first_name, last_name)), '')
  ),
  display_name = COALESCE(
    NULLIF(trim(display_name), ''),
    NULLIF(trim(concat_ws(' ', first_name, last_name)), ''),
    phone
  ),
  seller_type = COALESCE(NULLIF(trim(seller_type), ''), 'private');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_full_name_length_chk'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_full_name_length_chk
      CHECK (full_name IS NULL OR char_length(trim(full_name)) BETWEEN 2 AND 160);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_display_name_length_chk'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_display_name_length_chk
      CHECK (display_name IS NULL OR char_length(trim(display_name)) BETWEEN 2 AND 160);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_seller_type_chk'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_seller_type_chk
      CHECK (seller_type IS NULL OR seller_type IN ('private', 'dealer'));
  END IF;
END;
$$;

COMMENT ON COLUMN public.profiles.full_name IS
  'Seller/account full name for authenticated profile completion.';
COMMENT ON COLUMN public.profiles.display_name IS
  'Safe public-facing seller display name snapshot source.';
COMMENT ON COLUMN public.profiles.seller_type IS
  'Seller type for MVP publishing: private or dealer. Official dealer verification is intentionally not implemented.';

-- The previous authenticated public profile policy exposed private profile columns
-- such as phone. Public seller display must come from listing-safe fields instead.
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;

-- ---------------------------------------------------------------------------
-- Vehicle/profile metadata needed by the richer publish flow.
-- ---------------------------------------------------------------------------

ALTER TYPE vehicle.fuel_type ADD VALUE IF NOT EXISTS 'other';
ALTER TYPE vehicle.transmission_type ADD VALUE IF NOT EXISTS 'semi_automatic';

ALTER TABLE vehicle.vehicle_profiles
  ADD COLUMN IF NOT EXISTS trim TEXT;

ALTER TABLE vehicle.vehicle_profiles
  DROP CONSTRAINT IF EXISTS vehicle_profiles_drive_type_chk;

ALTER TABLE vehicle.vehicle_profiles
  ADD CONSTRAINT vehicle_profiles_drive_type_chk
  CHECK (drive_type IS NULL OR drive_type IN ('front', 'rear', 'awd', '4x4'));

ALTER TABLE vehicle.vehicle_profiles
  DROP CONSTRAINT IF EXISTS vehicle_profiles_damage_state_chk;

ALTER TABLE vehicle.vehicle_profiles
  ADD CONSTRAINT vehicle_profiles_damage_state_chk
  CHECK (damage_state IS NULL OR damage_state IN ('unknown', 'none', 'minor', 'major', 'painted', 'replaced', 'heavy_damage'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_profiles_trim_not_empty_chk'
  ) THEN
    ALTER TABLE vehicle.vehicle_profiles
      ADD CONSTRAINT vehicle_profiles_trim_not_empty_chk
      CHECK (trim IS NULL OR char_length(btrim(trim)) > 0);
  END IF;
END;
$$;

COMMENT ON COLUMN vehicle.vehicle_profiles.trim IS
  'Optional trim/version text for future title generation. WEB-06 UI does not require it.';

ALTER TABLE vehicle.profile_media
  ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';

UPDATE vehicle.profile_media
SET media_type = 'image'
WHERE media_type IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_media_media_type_chk'
  ) THEN
    ALTER TABLE vehicle.profile_media
      ADD CONSTRAINT profile_media_media_type_chk
      CHECK (media_type IS NULL OR media_type IN ('image'));
  END IF;
END;
$$;

COMMENT ON COLUMN vehicle.profile_media.media_type IS
  'Media type for listing assets. WEB-06 stores images only.';

DROP POLICY IF EXISTS profile_media_select_owner ON vehicle.profile_media;
CREATE POLICY profile_media_select_owner
  ON vehicle.profile_media
  FOR SELECT
  TO authenticated
  USING (vehicle.is_current_profile_owner(vehicle_profile_id));

-- ---------------------------------------------------------------------------
-- Listing quality and moderation metadata.
-- ---------------------------------------------------------------------------

ALTER TABLE marketplace.listings
  ADD COLUMN IF NOT EXISTS title_generated BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS quality_score SMALLINT,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cover_media_id UUID REFERENCES vehicle.profile_media(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seller_notes TEXT,
  ADD COLUMN IF NOT EXISTS seller_display_name TEXT;

UPDATE marketplace.listings
SET
  title_generated = COALESCE(title_generated, TRUE),
  moderation_status = COALESCE(NULLIF(trim(moderation_status), ''), 'active');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_quality_score_chk'
  ) THEN
    ALTER TABLE marketplace.listings
      ADD CONSTRAINT listings_quality_score_chk
      CHECK (quality_score IS NULL OR quality_score BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_moderation_status_chk'
  ) THEN
    ALTER TABLE marketplace.listings
      ADD CONSTRAINT listings_moderation_status_chk
      CHECK (moderation_status IN ('active', 'pending_review', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_seller_notes_not_empty_chk'
  ) THEN
    ALTER TABLE marketplace.listings
      ADD CONSTRAINT listings_seller_notes_not_empty_chk
      CHECK (seller_notes IS NULL OR char_length(trim(seller_notes)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_seller_display_name_not_empty_chk'
  ) THEN
    ALTER TABLE marketplace.listings
      ADD CONSTRAINT listings_seller_display_name_not_empty_chk
      CHECK (seller_display_name IS NULL OR char_length(trim(seller_display_name)) > 0);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS listings_moderation_status_idx
  ON marketplace.listings (moderation_status);

CREATE INDEX IF NOT EXISTS listings_quality_score_idx
  ON marketplace.listings (quality_score);

COMMENT ON COLUMN marketplace.listings.title_generated IS
  'Whether the public title was generated from structured vehicle data.';
COMMENT ON COLUMN marketplace.listings.quality_score IS
  'Lightweight seller-facing listing quality score from structured fields and photos.';
COMMENT ON COLUMN marketplace.listings.moderation_status IS
  'Basic future-ready moderation state. WEB-06 publishes active listings only.';
COMMENT ON COLUMN marketplace.listings.cover_media_id IS
  'Preferred cover media row for listing display.';
COMMENT ON COLUMN marketplace.listings.seller_notes IS
  'Private seller notes for future owner tools. Not exposed in public views.';
COMMENT ON COLUMN marketplace.listings.seller_display_name IS
  'Safe seller display name snapshot copied from the seller profile at publish time.';

-- ---------------------------------------------------------------------------
-- Listing photo storage bucket.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'listing-media',
  'listing-media',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS listing_media_select_public ON storage.objects;
CREATE POLICY listing_media_select_public
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'listing-media');

DROP POLICY IF EXISTS listing_media_insert_own_folder ON storage.objects;
CREATE POLICY listing_media_insert_own_folder
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS listing_media_update_own_folder ON storage.objects;
CREATE POLICY listing_media_update_own_folder
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'listing-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS listing_media_delete_own_folder ON storage.objects;
CREATE POLICY listing_media_delete_own_folder
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ---------------------------------------------------------------------------
-- Public views remain backward-compatible; WEB-06 adds nullable fields only.
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
  vp.owner_count,
  l.quality_score,
  l.seller_display_name
FROM marketplace.listings l
INNER JOIN vehicle.vehicle_profiles vp ON vp.id = l.vehicle_profile_id
INNER JOIN vehicle.makes ma ON ma.id = vp.make_id
INNER JOIN vehicle.models mo ON mo.id = vp.model_id
LEFT JOIN LATERAL (
  SELECT pm.url
  FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = vp.id
  ORDER BY (pm.id = l.cover_media_id) DESC, pm.is_cover DESC, pm.sort_order ASC, pm.created_at ASC
  LIMIT 1
) cover_media ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INT AS media_count
  FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = vp.id
) media_stats ON TRUE
WHERE l.status = 'active'
  AND l.moderation_status = 'active'
  AND vp.profile_status = 'active'
  AND ma.is_active = TRUE
  AND mo.is_active = TRUE;

COMMENT ON VIEW public.ff_home_listings IS
  'FlutterFlow public-schema read view for Home/Search listing cards. Exposes active, moderation-active listings only.';

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
  vp.owner_count,
  l.quality_score,
  l.seller_display_name
FROM marketplace.listings l
INNER JOIN vehicle.vehicle_profiles vp ON vp.id = l.vehicle_profile_id
INNER JOIN vehicle.makes ma ON ma.id = vp.make_id
INNER JOIN vehicle.models mo ON mo.id = vp.model_id
LEFT JOIN LATERAL (
  SELECT pm.url
  FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = vp.id
  ORDER BY (pm.id = l.cover_media_id) DESC, pm.is_cover DESC, pm.sort_order ASC, pm.created_at ASC
  LIMIT 1
) cover_media ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INT AS media_count
  FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = vp.id
) media_stats ON TRUE
WHERE l.status = 'active'
  AND l.moderation_status = 'active'
  AND vp.profile_status = 'active'
  AND ma.is_active = TRUE
  AND mo.is_active = TRUE;

COMMENT ON VIEW public.ff_listing_details IS
  'FlutterFlow public-schema read view for active listing details. Exposes only seller-safe display metadata.';

GRANT SELECT ON
  public.ff_home_listings,
  public.ff_listing_details
TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
