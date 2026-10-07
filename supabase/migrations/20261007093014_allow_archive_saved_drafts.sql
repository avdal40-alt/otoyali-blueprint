BEGIN;

-- Saved drafts introduced by the separate draft/moderation lifecycle have a
-- draft moderation state. Keep the established archive cases intact while
-- allowing that precise private state to be archived by its owner.
CREATE OR REPLACE FUNCTION public.archive_own_listing(p_listing_id UUID)
RETURNS TABLE (
  listing_id UUID,
  status TEXT,
  moderation_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing RECORD;
  v_new_status marketplace.listing_status;
  v_new_moderation_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing_id is required' USING ERRCODE = 'OT422';
  END IF;

  SELECT l.id, l.vehicle_profile_id, l.seller_id, l.status, l.moderation_status
  INTO v_listing
  FROM marketplace.listings AS l
  WHERE l.id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  IF v_listing.seller_id <> v_user_id
     OR NOT vehicle.is_current_profile_owner(v_listing.vehicle_profile_id, v_user_id) THEN
    RAISE EXCEPTION 'listing owner authorization required' USING ERRCODE = 'OT403';
  END IF;

  IF NOT (
    (v_listing.status IN ('draft', 'active', 'paused', 'removed')
      AND v_listing.moderation_status IN ('active', 'pending_review', 'rejected'))
    OR (v_listing.status = 'draft' AND v_listing.moderation_status = 'draft')
  ) THEN
    RAISE EXCEPTION 'illegal listing lifecycle transition' USING ERRCODE = 'OT409';
  END IF;

  UPDATE marketplace.listings AS l
  SET status = 'removed', moderation_status = 'archived', archived_at = now()
  WHERE l.id = p_listing_id
    AND l.status = v_listing.status
    AND l.moderation_status = v_listing.moderation_status
  RETURNING l.status, l.moderation_status
  INTO v_new_status, v_new_moderation_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing lifecycle changed during archive' USING ERRCODE = 'OT409';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id, action, entity_type, entity_id, metadata
  ) VALUES (
    v_user_id, 'listing.archive', 'listing', p_listing_id,
    jsonb_build_object(
      'previous_status', v_listing.status::TEXT,
      'previous_moderation_status', v_listing.moderation_status,
      'new_status', v_new_status::TEXT,
      'new_moderation_status', v_new_moderation_status
    )
  );

  RETURN QUERY SELECT p_listing_id, v_new_status::TEXT, v_new_moderation_status;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_own_listing(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_own_listing(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.archive_own_listing(UUID) FROM service_role;
REVOKE ALL ON FUNCTION public.archive_own_listing(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.archive_own_listing(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
