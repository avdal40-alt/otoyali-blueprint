BEGIN;

-- A newly-created seller draft remains in moderation_status = 'draft' until
-- submission. Cover assignment is part of durable media finalization, so it
-- must accept both pre-submit drafts and legacy pending-review drafts.
CREATE OR REPLACE FUNCTION public.set_own_listing_cover_media(
  p_listing_id UUID,
  p_cover_media_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_vehicle_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  SELECT vehicle_profile_id
    INTO v_vehicle_id
    FROM marketplace.listings
   WHERE id = p_listing_id
     AND seller_id = v_user_id
     AND status = 'draft'
     AND moderation_status IN ('draft', 'pending_review')
     AND archived_at IS NULL
   FOR UPDATE;

  IF NOT FOUND OR NOT vehicle.is_current_profile_owner(v_vehicle_id, v_user_id) THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  IF p_cover_media_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM vehicle.profile_media
     WHERE id = p_cover_media_id
       AND vehicle_profile_id = v_vehicle_id
       AND is_cover = TRUE
  ) THEN
    RAISE EXCEPTION 'invalid cover media' USING ERRCODE = 'OT422';
  END IF;

  UPDATE marketplace.listings
     SET cover_media_id = p_cover_media_id
   WHERE id = p_listing_id;
END;
$$;

COMMIT;
