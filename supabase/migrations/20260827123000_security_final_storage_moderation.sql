BEGIN;

-- Draft and pending-review media must not be directly enumerable or served
-- through the unauthenticated public-object endpoint.
UPDATE storage.buckets
SET public = FALSE
WHERE id IN ('vehicle-photos', 'listing-media', 'listing-videos');

DROP POLICY IF EXISTS vehicle_photos_select_public ON storage.objects;
DROP POLICY IF EXISTS listing_media_select_public ON storage.objects;
DROP POLICY IF EXISTS listing_videos_storage_select_public ON storage.objects;

CREATE POLICY vehicle_photos_select_authorized
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND (
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::TEXT)
      OR public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM vehicle.profile_media AS media
        WHERE media.storage_path = storage.objects.name
          AND vehicle.has_active_listing(media.vehicle_profile_id)
      )
    )
  );

CREATE POLICY listing_media_select_authorized
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'listing-media'
    AND (
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::TEXT)
      OR public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM vehicle.profile_media AS media
        WHERE storage.objects.name IN (
          media.storage_path,
          media.original_path,
          media.large_path,
          media.card_path,
          media.thumb_path
        )
          AND vehicle.has_active_listing(media.vehicle_profile_id)
      )
    )
  );

CREATE POLICY listing_videos_storage_select_authorized
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'listing-videos'
    AND (
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::TEXT)
      OR public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM marketplace.listing_videos AS video
        WHERE video.storage_path = storage.objects.name
          AND video.status = 'active'
          AND video.visibility = 'public'
          AND (
            video.listing_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM marketplace.listings AS listing
              WHERE listing.id = video.listing_id
                AND listing.status = 'active'
                AND listing.moderation_status = 'active'
            )
          )
      )
    )
  );

COMMENT ON POLICY listing_media_select_authorized ON storage.objects IS
  'Private bucket read gate: owner/admin previews or media attached to an active moderation-approved listing.';
COMMENT ON POLICY listing_videos_storage_select_authorized ON storage.objects IS
  'Private bucket read gate: owner/admin previews or active public videos whose linked listing is also approved.';

NOTIFY pgrst, 'reload schema';

COMMIT;
