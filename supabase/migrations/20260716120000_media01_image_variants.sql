BEGIN;

-- MEDIA-01: additive image variant metadata and safer public media views.
-- Existing url/storage_path rows remain valid; new uploads can store original,
-- large, card, and thumb variants without requiring a worker.

ALTER TABLE vehicle.profile_media
  ADD COLUMN IF NOT EXISTS original_path TEXT,
  ADD COLUMN IF NOT EXISTS large_path TEXT,
  ADD COLUMN IF NOT EXISTS card_path TEXT,
  ADD COLUMN IF NOT EXISTS thumb_path TEXT,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS aspect_ratio NUMERIC,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_media_original_path_not_empty_chk'
  ) THEN
    ALTER TABLE vehicle.profile_media
      ADD CONSTRAINT profile_media_original_path_not_empty_chk
      CHECK (original_path IS NULL OR char_length(trim(original_path)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_media_large_path_not_empty_chk'
  ) THEN
    ALTER TABLE vehicle.profile_media
      ADD CONSTRAINT profile_media_large_path_not_empty_chk
      CHECK (large_path IS NULL OR char_length(trim(large_path)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_media_card_path_not_empty_chk'
  ) THEN
    ALTER TABLE vehicle.profile_media
      ADD CONSTRAINT profile_media_card_path_not_empty_chk
      CHECK (card_path IS NULL OR char_length(trim(card_path)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_media_thumb_path_not_empty_chk'
  ) THEN
    ALTER TABLE vehicle.profile_media
      ADD CONSTRAINT profile_media_thumb_path_not_empty_chk
      CHECK (thumb_path IS NULL OR char_length(trim(thumb_path)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_media_dimensions_positive_chk'
  ) THEN
    ALTER TABLE vehicle.profile_media
      ADD CONSTRAINT profile_media_dimensions_positive_chk
      CHECK (
        (width IS NULL OR width > 0)
        AND (height IS NULL OR height > 0)
        AND (aspect_ratio IS NULL OR aspect_ratio > 0)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_media_mime_type_not_empty_chk'
  ) THEN
    ALTER TABLE vehicle.profile_media
      ADD CONSTRAINT profile_media_mime_type_not_empty_chk
      CHECK (mime_type IS NULL OR char_length(trim(mime_type)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_media_size_bytes_positive_chk'
  ) THEN
    ALTER TABLE vehicle.profile_media
      ADD CONSTRAINT profile_media_size_bytes_positive_chk
      CHECK (size_bytes IS NULL OR size_bytes > 0);
  END IF;
END;
$$;

COMMENT ON COLUMN vehicle.profile_media.original_path IS
  'Storage path for the source-safe original image variant.';
COMMENT ON COLUMN vehicle.profile_media.large_path IS
  'Storage path for listing detail large image variant.';
COMMENT ON COLUMN vehicle.profile_media.card_path IS
  'Storage path for listing card image variant.';
COMMENT ON COLUMN vehicle.profile_media.thumb_path IS
  'Storage path for thumbnail/admin image variant.';
COMMENT ON COLUMN vehicle.profile_media.width IS
  'Pixel width of the source-safe original variant when known.';
COMMENT ON COLUMN vehicle.profile_media.height IS
  'Pixel height of the source-safe original variant when known.';
COMMENT ON COLUMN vehicle.profile_media.aspect_ratio IS
  'Width divided by height for layout and future processing.';
COMMENT ON COLUMN vehicle.profile_media.mime_type IS
  'MIME type of the stored source-safe original variant.';
COMMENT ON COLUMN vehicle.profile_media.size_bytes IS
  'Byte size of the stored source-safe original variant.';
COMMENT ON COLUMN vehicle.profile_media.processed_status IS
  'Image processing state. MEDIA-01 browser preprocessing writes processed/failed; future workers can update this.';
COMMENT ON COLUMN vehicle.profile_media.blur_status IS
  'Future license plate blur state. MEDIA-01 does not perform automatic blur.';

CREATE INDEX IF NOT EXISTS profile_media_processed_status_idx
  ON vehicle.profile_media (processed_status);

CREATE INDEX IF NOT EXISTS profile_media_created_at_idx
  ON vehicle.profile_media (created_at DESC);

DROP POLICY IF EXISTS profile_media_select_admin ON vehicle.profile_media;
CREATE POLICY profile_media_select_admin
  ON vehicle.profile_media
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

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
  cover_media.cover_image_url,
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
  l.seller_display_name,
  COALESCE(video_stats.video_count, 0) AS video_count
FROM marketplace.listings l
INNER JOIN vehicle.vehicle_profiles vp ON vp.id = l.vehicle_profile_id
INNER JOIN vehicle.makes ma ON ma.id = vp.make_id
INNER JOIN vehicle.models mo ON mo.id = vp.model_id
LEFT JOIN LATERAL (
  SELECT COALESCE(pm.card_url, pm.large_url, pm.url) AS cover_image_url
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
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INT AS video_count
  FROM marketplace.listing_videos lv
  WHERE lv.listing_id = l.id
    AND lv.status = 'active'
    AND lv.visibility = 'public'
) video_stats ON TRUE
WHERE l.status = 'active'
  AND l.moderation_status = 'active'
  AND vp.profile_status = 'active'
  AND ma.is_active = TRUE
  AND mo.is_active = TRUE;

COMMENT ON VIEW public.ff_home_listings IS
  'FlutterFlow public-schema read view for Home/Search listing cards. cover_image_url prefers card/large variants and exposes active, moderation-active listings only.';

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
  cover_media.cover_image_url,
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
  l.seller_display_name,
  COALESCE(video_stats.video_count, 0) AS video_count
FROM marketplace.listings l
INNER JOIN vehicle.vehicle_profiles vp ON vp.id = l.vehicle_profile_id
INNER JOIN vehicle.makes ma ON ma.id = vp.make_id
INNER JOIN vehicle.models mo ON mo.id = vp.model_id
LEFT JOIN LATERAL (
  SELECT COALESCE(pm.large_url, pm.original_url, pm.url) AS cover_image_url
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
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INT AS video_count
  FROM marketplace.listing_videos lv
  WHERE lv.listing_id = l.id
    AND lv.status = 'active'
    AND lv.visibility = 'public'
) video_stats ON TRUE
WHERE l.status = 'active'
  AND l.moderation_status = 'active'
  AND vp.profile_status = 'active'
  AND ma.is_active = TRUE
  AND mo.is_active = TRUE;

COMMENT ON VIEW public.ff_listing_details IS
  'FlutterFlow public-schema read view for active listing details. cover_image_url prefers large/original variants and exposes only seller-safe display metadata.';

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
  pm.is_cover,
  pm.original_url,
  pm.large_url,
  pm.card_url,
  pm.thumb_url,
  pm.processed_status,
  pm.blur_status,
  pm.width,
  pm.height,
  pm.aspect_ratio,
  pm.mime_type,
  pm.size_bytes
FROM marketplace.listings l
INNER JOIN vehicle.vehicle_profiles vp ON vp.id = l.vehicle_profile_id
INNER JOIN vehicle.makes ma ON ma.id = vp.make_id
INNER JOIN vehicle.models mo ON mo.id = vp.model_id
INNER JOIN vehicle.profile_media pm ON pm.vehicle_profile_id = vp.id
WHERE l.status = 'active'
  AND l.moderation_status = 'active'
  AND vp.profile_status = 'active'
  AND ma.is_active = TRUE
  AND mo.is_active = TRUE;

COMMENT ON VIEW public.ff_listing_media IS
  'FlutterFlow public-schema read view for media attached to active, moderation-active listings. Variant columns are appended for optimized rendering.';

CREATE OR REPLACE VIEW public.ff_akis_videos
WITH (security_invoker = true)
AS
SELECT
  v.id AS video_id,
  v.listing_id,
  v.title,
  v.description,
  v.video_url,
  v.thumbnail_url,
  v.poster_url,
  v.duration_seconds,
  v.likes_count,
  v.views_count,
  v.created_at,
  v.sort_order,
  l.title AS listing_title,
  l.price_amount,
  l.currency::TEXT AS currency,
  l.city,
  vp.year,
  vp.mileage_km,
  vp.fuel_type::TEXT AS fuel_type,
  l.seller_type,
  l.seller_display_name,
  cover_media.cover_image_url
FROM marketplace.listing_videos v
LEFT JOIN marketplace.listings l
  ON l.id = v.listing_id
  AND l.status = 'active'
  AND l.moderation_status = 'active'
LEFT JOIN vehicle.vehicle_profiles vp
  ON vp.id = l.vehicle_profile_id
  AND vp.profile_status = 'active'
LEFT JOIN vehicle.makes ma
  ON ma.id = vp.make_id
  AND ma.is_active = TRUE
LEFT JOIN vehicle.models mo
  ON mo.id = vp.model_id
  AND mo.is_active = TRUE
LEFT JOIN LATERAL (
  SELECT COALESCE(pm.card_url, pm.large_url, pm.url) AS cover_image_url
  FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = vp.id
  ORDER BY (pm.id = l.cover_media_id) DESC, pm.is_cover DESC, pm.sort_order ASC, pm.created_at ASC
  LIMIT 1
) cover_media ON TRUE
WHERE v.status = 'active'
  AND v.visibility = 'public'
  AND (
    v.listing_id IS NULL
    OR (
      l.id IS NOT NULL
      AND vp.id IS NOT NULL
      AND ma.id IS NOT NULL
      AND mo.id IS NOT NULL
    )
  );

COMMENT ON VIEW public.ff_akis_videos IS
  'Public read view for OTOYALI Video. Active public videos only; cover image prefers optimized card/large variants.';

GRANT SELECT ON
  public.ff_home_listings,
  public.ff_listing_details,
  public.ff_listing_media,
  public.ff_akis_videos
TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
