BEGIN;

-- A verification revocation immediately changes public-video eligibility. Keep
-- the canonical Search projection aligned without relying on an application job.
CREATE OR REPLACE FUNCTION marketplace.sync_listing_search_documents_for_galeri_video_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_listing_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  FOR v_listing_id IN
    SELECT DISTINCT video.listing_id
    FROM marketplace.listing_videos AS video
    WHERE video.seller_user_id = NEW.dealer_id
      AND video.listing_id IS NOT NULL
  LOOP
    PERFORM marketplace.refresh_listing_search_document(v_listing_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS galeri_verification_video_search_sync ON marketplace.galeri_verifications;
CREATE TRIGGER galeri_verification_video_search_sync
AFTER UPDATE OF status ON marketplace.galeri_verifications
FOR EACH ROW EXECUTE FUNCTION marketplace.sync_listing_search_documents_for_galeri_video_verification();

REVOKE ALL ON FUNCTION marketplace.sync_listing_search_documents_for_galeri_video_verification() FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION marketplace.sync_listing_search_documents_for_galeri_video_verification() IS
  'FUNCTIONAL-03C-A internal trigger: a Galeri verification transition refreshes all of that seller''s affected Search documents.';

NOTIFY pgrst, 'reload schema';
COMMIT;
