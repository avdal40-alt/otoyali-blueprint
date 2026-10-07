BEGIN;

CREATE OR REPLACE FUNCTION public.submit_own_listing_for_review(p_listing_id UUID)
RETURNS TABLE(listing_id UUID, status TEXT, moderation_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_user_id UUID := auth.uid(); v_listing marketplace.listings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT * INTO v_listing FROM marketplace.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  IF v_listing.seller_id <> v_user_id OR NOT vehicle.is_current_profile_owner(v_listing.vehicle_profile_id, v_user_id) THEN
    RAISE EXCEPTION 'listing owner authorization required' USING ERRCODE = 'OT403';
  END IF;
  IF v_listing.status <> 'draft' OR v_listing.moderation_status <> 'draft' OR v_listing.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'illegal listing lifecycle transition' USING ERRCODE = 'OT409';
  END IF;
  UPDATE marketplace.listings AS l
  SET moderation_status = 'pending_review', moderation_note = NULL,
      rejection_reason = NULL, moderated_by = NULL, moderated_at = NULL
  WHERE l.id = p_listing_id AND l.status = 'draft' AND l.moderation_status = 'draft'
  RETURNING l.id, l.status::TEXT, l.moderation_status INTO listing_id, status, moderation_status;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing lifecycle changed during submit' USING ERRCODE = 'OT409'; END IF;
  RETURN NEXT;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
