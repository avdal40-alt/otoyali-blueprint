-- FUNCTIONAL-03C-A additive correction: public Storage reads are a separate
-- capability from verified-Galeri owner management.
CREATE OR REPLACE FUNCTION marketplace.can_read_public_listing_video_storage_path(p_storage_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_storage_path IS NOT NULL AND EXISTS (
    SELECT 1
    FROM marketplace.listing_videos AS video
    WHERE video.storage_path = p_storage_path
      AND video.listing_id IS NOT NULL
      AND video.is_current
      AND marketplace.is_listing_video_publicly_eligible(video.id)
  );
$$;

REVOKE ALL ON FUNCTION marketplace.can_read_public_listing_video_storage_path(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION marketplace.can_read_public_listing_video_storage_path(TEXT) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS listing_videos_storage_select_authorized ON storage.objects;
CREATE POLICY listing_videos_storage_select_owner_or_admin ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'listing-videos'
  AND (
    public.is_admin(auth.uid())
    OR marketplace.can_manage_own_listing_video_storage_path(name)
  )
);
CREATE POLICY listing_videos_storage_select_public ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'listing-videos'
  AND marketplace.can_read_public_listing_video_storage_path(name)
);

COMMENT ON FUNCTION marketplace.can_read_public_listing_video_storage_path(TEXT) IS
  'FUNCTIONAL-03C-A public read-only Storage predicate. It maps a path only to the canonical public video eligibility contract and grants no management authority.';

NOTIFY pgrst, 'reload schema';
