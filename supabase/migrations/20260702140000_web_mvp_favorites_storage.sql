-- =============================================================================
-- OTOYALI - Web MVP favorites and vehicle photo storage
-- Migration: 20260702140000_web_mvp_favorites_storage.sql
-- Scope: minimal favorites table and public vehicle photo bucket for WEB-01
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Favorites
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketplace.listing_favorites (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID        NOT NULL REFERENCES marketplace.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT listing_favorites_user_listing_unique UNIQUE (user_id, listing_id)
);

COMMENT ON TABLE marketplace.listing_favorites IS
  'Minimal authenticated-user favorites for the Web MVP.';

CREATE INDEX IF NOT EXISTS listing_favorites_user_created_idx
  ON marketplace.listing_favorites (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS listing_favorites_listing_id_idx
  ON marketplace.listing_favorites (listing_id);

ALTER TABLE marketplace.listing_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listing_favorites_select_own ON marketplace.listing_favorites;
CREATE POLICY listing_favorites_select_own
  ON marketplace.listing_favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS listing_favorites_insert_own ON marketplace.listing_favorites;
CREATE POLICY listing_favorites_insert_own
  ON marketplace.listing_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS listing_favorites_delete_own ON marketplace.listing_favorites;
CREATE POLICY listing_favorites_delete_own
  ON marketplace.listing_favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS listing_favorites_service_role_all ON marketplace.listing_favorites;
CREATE POLICY listing_favorites_service_role_all
  ON marketplace.listing_favorites
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

GRANT SELECT, INSERT, DELETE ON marketplace.listing_favorites TO authenticated;
GRANT ALL ON marketplace.listing_favorites TO service_role;

-- ---------------------------------------------------------------------------
-- Vehicle photo storage
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'vehicle-photos',
  'vehicle-photos',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS vehicle_photos_select_public ON storage.objects;
CREATE POLICY vehicle_photos_select_public
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'vehicle-photos');

DROP POLICY IF EXISTS vehicle_photos_insert_own_folder ON storage.objects;
CREATE POLICY vehicle_photos_insert_own_folder
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS vehicle_photos_update_own_folder ON storage.objects;
CREATE POLICY vehicle_photos_update_own_folder
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS vehicle_photos_delete_own_folder ON storage.objects;
CREATE POLICY vehicle_photos_delete_own_folder
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

COMMIT;
