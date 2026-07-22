-- SECURITY-01: listing lifecycle and moderation hardening.
-- Additive production guardrails for marketplace.listings. This migration keeps
-- public views unchanged and makes database transitions authoritative.

BEGIN;

-- Authenticated users may still edit explicitly audited listing content fields,
-- but protected lifecycle and moderation columns are no longer directly writable.
REVOKE UPDATE ON marketplace.listings FROM authenticated;

GRANT UPDATE (
  title,
  title_generated,
  description,
  price_amount,
  currency,
  price_negotiable,
  city,
  seller_type,
  seller_display_name,
  seller_notes,
  quality_score,
  cover_media_id
) ON marketplace.listings TO authenticated;

DROP POLICY IF EXISTS listings_insert_own ON marketplace.listings;
CREATE POLICY listings_insert_own
  ON marketplace.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_id = auth.uid()
    AND vehicle.is_current_profile_owner(vehicle_profile_id)
    AND status = 'draft'
    AND moderation_status = 'pending_review'
    AND published_at IS NULL
    AND moderated_by IS NULL
    AND moderated_at IS NULL
    AND archived_at IS NULL
    AND rejection_reason IS NULL
    AND moderation_note IS NULL
  );

CREATE OR REPLACE FUNCTION public.submit_own_listing_for_review(p_listing_id UUID)
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

  SELECT
    l.id,
    l.vehicle_profile_id,
    l.seller_id,
    l.status,
    l.moderation_status
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
    v_listing.status = 'draft'
    AND v_listing.moderation_status IN ('active', 'pending_review')
  ) THEN
    RAISE EXCEPTION 'illegal listing lifecycle transition' USING ERRCODE = 'OT409';
  END IF;

  UPDATE marketplace.listings AS l
  SET
    status = 'draft',
    moderation_status = 'pending_review',
    moderation_note = NULL,
    rejection_reason = NULL,
    moderated_by = NULL,
    moderated_at = NULL,
    archived_at = NULL
  WHERE l.id = p_listing_id
    AND l.status = v_listing.status
    AND l.moderation_status = v_listing.moderation_status
  RETURNING l.status, l.moderation_status
  INTO v_new_status, v_new_moderation_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing lifecycle changed during submit' USING ERRCODE = 'OT409';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_user_id,
    'listing.submit',
    'listing',
    p_listing_id,
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

CREATE OR REPLACE FUNCTION public.resubmit_own_listing_for_review(p_listing_id UUID)
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

  SELECT
    l.id,
    l.vehicle_profile_id,
    l.seller_id,
    l.status,
    l.moderation_status
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
    v_listing.status IN ('draft', 'removed')
    AND v_listing.moderation_status = 'rejected'
  ) THEN
    RAISE EXCEPTION 'illegal listing lifecycle transition' USING ERRCODE = 'OT409';
  END IF;

  UPDATE marketplace.listings AS l
  SET
    status = 'draft',
    moderation_status = 'pending_review',
    moderation_note = NULL,
    rejection_reason = NULL,
    moderated_by = NULL,
    moderated_at = NULL,
    archived_at = NULL
  WHERE l.id = p_listing_id
    AND l.status = v_listing.status
    AND l.moderation_status = v_listing.moderation_status
  RETURNING l.status, l.moderation_status
  INTO v_new_status, v_new_moderation_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing lifecycle changed during resubmit' USING ERRCODE = 'OT409';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_user_id,
    'listing.resubmit',
    'listing',
    p_listing_id,
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

CREATE OR REPLACE FUNCTION public.pause_own_listing(p_listing_id UUID)
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

  SELECT
    l.id,
    l.vehicle_profile_id,
    l.seller_id,
    l.status,
    l.moderation_status
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
    v_listing.status = 'active'
    AND v_listing.moderation_status = 'active'
  ) THEN
    RAISE EXCEPTION 'illegal listing lifecycle transition' USING ERRCODE = 'OT409';
  END IF;

  UPDATE marketplace.listings AS l
  SET status = 'paused'
  WHERE l.id = p_listing_id
    AND l.status = v_listing.status
    AND l.moderation_status = v_listing.moderation_status
  RETURNING l.status, l.moderation_status
  INTO v_new_status, v_new_moderation_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing lifecycle changed during pause' USING ERRCODE = 'OT409';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_user_id,
    'listing.pause',
    'listing',
    p_listing_id,
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

  SELECT
    l.id,
    l.vehicle_profile_id,
    l.seller_id,
    l.status,
    l.moderation_status
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
    v_listing.status IN ('draft', 'active', 'paused', 'removed')
    AND v_listing.moderation_status IN ('active', 'pending_review', 'rejected')
  ) THEN
    RAISE EXCEPTION 'illegal listing lifecycle transition' USING ERRCODE = 'OT409';
  END IF;

  UPDATE marketplace.listings AS l
  SET
    status = 'removed',
    moderation_status = 'archived',
    archived_at = now()
  WHERE l.id = p_listing_id
    AND l.status = v_listing.status
    AND l.moderation_status = v_listing.moderation_status
  RETURNING l.status, l.moderation_status
  INTO v_new_status, v_new_moderation_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing lifecycle changed during archive' USING ERRCODE = 'OT409';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_user_id,
    'listing.archive',
    'listing',
    p_listing_id,
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

CREATE OR REPLACE FUNCTION public.review_listing_moderation(
  p_listing_id UUID,
  p_decision TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  listing_id UUID,
  status TEXT,
  moderation_status TEXT,
  moderated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_decision TEXT := lower(btrim(COALESCE(p_decision, '')));
  v_rejection_reason TEXT := NULLIF(regexp_replace(btrim(COALESCE(p_rejection_reason, '')), '\s+', ' ', 'g'), '');
  v_listing RECORD;
  v_new_status marketplace.listing_status;
  v_new_moderation_status TEXT;
  v_moderated_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  IF NOT public.is_admin(v_user_id) THEN
    RAISE EXCEPTION 'admin authorization required' USING ERRCODE = 'OT403';
  END IF;

  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing_id is required' USING ERRCODE = 'OT422';
  END IF;

  IF v_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'unsupported listing moderation decision' USING ERRCODE = 'OT422';
  END IF;

  IF v_decision = 'reject' AND v_rejection_reason IS NULL THEN
    RAISE EXCEPTION 'rejection reason is required' USING ERRCODE = 'OT422';
  END IF;

  IF v_rejection_reason IS NOT NULL AND char_length(v_rejection_reason) > 1600 THEN
    RAISE EXCEPTION 'rejection reason is too long' USING ERRCODE = 'OT422';
  END IF;

  SELECT
    l.id,
    l.status,
    l.moderation_status
  INTO v_listing
  FROM marketplace.listings AS l
  WHERE l.id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  IF NOT (
    v_listing.status = 'draft'
    AND v_listing.moderation_status = 'pending_review'
  ) THEN
    RAISE EXCEPTION 'illegal listing moderation transition' USING ERRCODE = 'OT409';
  END IF;

  IF v_decision = 'approve' THEN
    UPDATE marketplace.listings AS l
    SET
      status = 'active',
      moderation_status = 'active',
      moderation_note = NULL,
      rejection_reason = NULL,
      archived_at = NULL,
      moderated_by = v_user_id,
      moderated_at = now()
    WHERE l.id = p_listing_id
      AND l.status = v_listing.status
      AND l.moderation_status = v_listing.moderation_status
    RETURNING l.status, l.moderation_status, l.moderated_at
    INTO v_new_status, v_new_moderation_status, v_moderated_at;
  ELSE
    UPDATE marketplace.listings AS l
    SET
      status = 'removed',
      moderation_status = 'rejected',
      moderation_note = v_rejection_reason,
      rejection_reason = v_rejection_reason,
      archived_at = NULL,
      moderated_by = v_user_id,
      moderated_at = now()
    WHERE l.id = p_listing_id
      AND l.status = v_listing.status
      AND l.moderation_status = v_listing.moderation_status
    RETURNING l.status, l.moderation_status, l.moderated_at
    INTO v_new_status, v_new_moderation_status, v_moderated_at;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing moderation changed during review' USING ERRCODE = 'OT409';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_user_id,
    CASE WHEN v_decision = 'approve' THEN 'listing.approve' ELSE 'listing.reject' END,
    'listing',
    p_listing_id,
    jsonb_build_object(
      'previous_status', v_listing.status::TEXT,
      'previous_moderation_status', v_listing.moderation_status,
      'new_status', v_new_status::TEXT,
      'new_moderation_status', v_new_moderation_status
    )
  );

  RETURN QUERY SELECT p_listing_id, v_new_status::TEXT, v_new_moderation_status, v_moderated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_own_listing_for_review(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_own_listing_for_review(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.submit_own_listing_for_review(UUID) FROM service_role;
REVOKE ALL ON FUNCTION public.submit_own_listing_for_review(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_own_listing_for_review(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.resubmit_own_listing_for_review(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resubmit_own_listing_for_review(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.resubmit_own_listing_for_review(UUID) FROM service_role;
REVOKE ALL ON FUNCTION public.resubmit_own_listing_for_review(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.resubmit_own_listing_for_review(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.pause_own_listing(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pause_own_listing(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.pause_own_listing(UUID) FROM service_role;
REVOKE ALL ON FUNCTION public.pause_own_listing(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.pause_own_listing(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.archive_own_listing(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_own_listing(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.archive_own_listing(UUID) FROM service_role;
REVOKE ALL ON FUNCTION public.archive_own_listing(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.archive_own_listing(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.review_listing_moderation(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_listing_moderation(UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.review_listing_moderation(UUID, TEXT, TEXT) FROM service_role;
REVOKE ALL ON FUNCTION public.review_listing_moderation(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.review_listing_moderation(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.submit_own_listing_for_review(UUID) IS
  'Owner-only listing lifecycle RPC. Enforces draft to pending-review without allowing public approval.';
COMMENT ON FUNCTION public.resubmit_own_listing_for_review(UUID) IS
  'Owner-only listing lifecycle RPC. Enforces rejected listing resubmission to pending-review.';
COMMENT ON FUNCTION public.pause_own_listing(UUID) IS
  'Owner-only listing lifecycle RPC. Pauses an approved public listing without changing moderation approval.';
COMMENT ON FUNCTION public.archive_own_listing(UUID) IS
  'Owner-only listing lifecycle RPC. Archives an owned non-archived listing without admin approval bypass.';
COMMENT ON FUNCTION public.review_listing_moderation(UUID, TEXT, TEXT) IS
  'Admin-only listing moderation RPC. Enforces pending-review approve/reject transitions and derives reviewer identity from auth.uid().';

NOTIFY pgrst, 'reload schema';

COMMIT;
