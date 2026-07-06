-- =============================================================================
-- OTOYALI - WEB-07 Akış short video feed
-- Migration: 20260706140000_web07_akis_video_feed.sql
-- Scope: minimal listing video metadata, storage bucket, public feed views,
--        and active-video counts for listing cards.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Listing videos
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketplace.listing_videos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       UUID        REFERENCES marketplace.listings(id) ON DELETE SET NULL,
  seller_user_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  title            TEXT,
  description      TEXT,
  video_url        TEXT,
  storage_path     TEXT,
  thumbnail_url    TEXT,
  duration_seconds INT,
  status           TEXT        NOT NULL DEFAULT 'pending_review',
  visibility       TEXT        NOT NULL DEFAULT 'public',
  sort_order       INT         NOT NULL DEFAULT 0,
  likes_count      INT         NOT NULL DEFAULT 0,
  views_count      INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT listing_videos_title_not_empty_chk
    CHECK (title IS NULL OR char_length(trim(title)) > 0),

  CONSTRAINT listing_videos_description_not_empty_chk
    CHECK (description IS NULL OR char_length(trim(description)) > 0),

  CONSTRAINT listing_videos_video_url_not_empty_chk
    CHECK (video_url IS NULL OR char_length(trim(video_url)) > 0),

  CONSTRAINT listing_videos_storage_path_not_empty_chk
    CHECK (storage_path IS NULL OR char_length(trim(storage_path)) > 0),

  CONSTRAINT listing_videos_thumbnail_url_not_empty_chk
    CHECK (thumbnail_url IS NULL OR char_length(trim(thumbnail_url)) > 0),

  CONSTRAINT listing_videos_duration_seconds_chk
    CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 1 AND 60),

  CONSTRAINT listing_videos_status_chk
    CHECK (status IN ('draft', 'pending_review', 'active', 'rejected', 'archived')),

  CONSTRAINT listing_videos_active_asset_chk
    CHECK (status <> 'active' OR (video_url IS NOT NULL AND duration_seconds IS NOT NULL)),

  CONSTRAINT listing_videos_visibility_chk
    CHECK (visibility IN ('public', 'unlisted', 'private')),

  CONSTRAINT listing_videos_sort_order_chk
    CHECK (sort_order >= 0),

  CONSTRAINT listing_videos_counts_chk
    CHECK (likes_count >= 0 AND views_count >= 0)
);

COMMENT ON TABLE marketplace.listing_videos IS
  'Short seller-uploaded vehicle videos for OTOYALI Akış. Public feed only shows active public rows.';
COMMENT ON COLUMN marketplace.listing_videos.status IS
  'Video moderation state. Seller uploads default to pending_review and require manual approval for public feed visibility.';
COMMENT ON COLUMN marketplace.listing_videos.visibility IS
  'Public feed visibility. MVP uses public rows after approval; private/unlisted are reserved states.';

CREATE INDEX IF NOT EXISTS listing_videos_public_feed_idx
  ON marketplace.listing_videos (status, visibility, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS listing_videos_listing_id_idx
  ON marketplace.listing_videos (listing_id);

CREATE INDEX IF NOT EXISTS listing_videos_seller_created_idx
  ON marketplace.listing_videos (seller_user_id, created_at DESC);

DROP TRIGGER IF EXISTS listing_videos_set_updated_at ON marketplace.listing_videos;
CREATE TRIGGER listing_videos_set_updated_at
  BEFORE UPDATE ON marketplace.listing_videos
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

ALTER TABLE marketplace.listing_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listing_videos_select_public_active ON marketplace.listing_videos;
CREATE POLICY listing_videos_select_public_active
  ON marketplace.listing_videos
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND visibility = 'public');

DROP POLICY IF EXISTS listing_videos_select_own ON marketplace.listing_videos;
CREATE POLICY listing_videos_select_own
  ON marketplace.listing_videos
  FOR SELECT
  TO authenticated
  USING (seller_user_id = auth.uid());

DROP POLICY IF EXISTS listing_videos_insert_own ON marketplace.listing_videos;
CREATE POLICY listing_videos_insert_own
  ON marketplace.listing_videos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_user_id = auth.uid()
    AND status IN ('draft', 'pending_review')
    AND (
      listing_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM marketplace.listings l
        WHERE l.id = listing_videos.listing_id
          AND l.seller_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS listing_videos_update_own_pending ON marketplace.listing_videos;
CREATE POLICY listing_videos_update_own_pending
  ON marketplace.listing_videos
  FOR UPDATE
  TO authenticated
  USING (
    seller_user_id = auth.uid()
    AND status IN ('draft', 'pending_review')
  )
  WITH CHECK (
    seller_user_id = auth.uid()
    AND status IN ('draft', 'pending_review')
    AND (
      listing_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM marketplace.listings l
        WHERE l.id = listing_videos.listing_id
          AND l.seller_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS listing_videos_delete_own_pending ON marketplace.listing_videos;
CREATE POLICY listing_videos_delete_own_pending
  ON marketplace.listing_videos
  FOR DELETE
  TO authenticated
  USING (
    seller_user_id = auth.uid()
    AND status IN ('draft', 'pending_review')
  );

DROP POLICY IF EXISTS listing_videos_service_role_all ON marketplace.listing_videos;
CREATE POLICY listing_videos_service_role_all
  ON marketplace.listing_videos
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

GRANT SELECT ON marketplace.listing_videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON marketplace.listing_videos TO authenticated;
GRANT ALL ON marketplace.listing_videos TO service_role;

-- ---------------------------------------------------------------------------
-- Listing video storage bucket
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'listing-videos',
  'listing-videos',
  TRUE,
  104857600,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS listing_videos_storage_select_public ON storage.objects;
CREATE POLICY listing_videos_storage_select_public
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'listing-videos');

DROP POLICY IF EXISTS listing_videos_storage_insert_own_folder ON storage.objects;
CREATE POLICY listing_videos_storage_insert_own_folder
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-videos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS listing_videos_storage_update_own_folder ON storage.objects;
CREATE POLICY listing_videos_storage_update_own_folder
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-videos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'listing-videos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS listing_videos_storage_delete_own_folder ON storage.objects;
CREATE POLICY listing_videos_storage_delete_own_folder
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-videos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ---------------------------------------------------------------------------
-- Public views. These expose active public videos only and no private seller
-- profile data. Listing/card views get counts only, so Home/Search do not load
-- video files.
-- ---------------------------------------------------------------------------

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
  cover_media.url AS cover_image_url
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
  SELECT pm.url
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
  'Public read view for OTOYALI Akış. Active public videos only; no private seller profile data.';

CREATE OR REPLACE VIEW public.ff_listing_video_counts
WITH (security_invoker = true)
AS
SELECT
  listing_id,
  COUNT(*)::INT AS video_count
FROM marketplace.listing_videos
WHERE status = 'active'
  AND visibility = 'public'
  AND listing_id IS NOT NULL
GROUP BY listing_id;

COMMENT ON VIEW public.ff_listing_video_counts IS
  'Active public video counts for listing cards. Does not expose video files.';

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
  COALESCE(video_stats.video_count, 0) AS video_count,
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
  'FlutterFlow public-schema read view for Home/Search listing cards. Exposes active, moderation-active listings only; video_count is metadata only.';

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
  COALESCE(video_stats.video_count, 0) AS video_count,
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
  'FlutterFlow public-schema read view for active listing details. Exposes only seller-safe display metadata.';

GRANT SELECT ON
  public.ff_akis_videos,
  public.ff_listing_video_counts,
  public.ff_home_listings,
  public.ff_listing_details
TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
