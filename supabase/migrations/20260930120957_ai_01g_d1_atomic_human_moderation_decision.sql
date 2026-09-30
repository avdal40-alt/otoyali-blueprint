BEGIN;

CREATE FUNCTION public.review_listing_moderation_with_override(
  p_listing_id UUID,
  p_run_id UUID,
  p_decision TEXT,
  p_reason_code TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  override_id UUID,
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
  v_moderator_user_id UUID := auth.uid();
  v_decision TEXT := lower(btrim(COALESCE(p_decision, '')));
  v_reason_code TEXT := NULLIF(regexp_replace(lower(btrim(COALESCE(p_reason_code, ''))), '\s+', '-', 'g'), '');
  v_override_decision TEXT;
  v_current_run_id UUID;
  v_override_id UUID;
  v_lifecycle RECORD;
BEGIN
  IF v_moderator_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  IF NOT public.is_admin(v_moderator_user_id) THEN
    RAISE EXCEPTION 'admin authorization required' USING ERRCODE = 'OT403';
  END IF;

  IF p_listing_id IS NULL OR p_run_id IS NULL THEN
    RAISE EXCEPTION 'listing_id and run_id are required' USING ERRCODE = 'OT422';
  END IF;

  IF v_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'unsupported listing moderation decision' USING ERRCODE = 'OT422';
  END IF;

  IF v_reason_code IS NOT NULL
     AND (char_length(v_reason_code) > 80 OR v_reason_code !~ '^[a-z0-9][a-z0-9._-]*$') THEN
    RAISE EXCEPTION 'invalid moderation reason code' USING ERRCODE = 'OT422';
  END IF;

  IF v_decision = 'reject' AND v_reason_code IS NULL THEN
    RAISE EXCEPTION 'rejection reason code is required' USING ERRCODE = 'OT422';
  END IF;

  -- Lock the listing first. The moderation-run FK then serializes a concurrent
  -- run insert until this decision has either committed or rolled back.
  PERFORM 1
  FROM marketplace.listings AS listing
  WHERE listing.id = p_listing_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  SELECT run.id
  INTO v_current_run_id
  FROM marketplace.listing_moderation_runs AS run
  WHERE run.listing_id = p_listing_id
  ORDER BY run.created_at DESC, run.id DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'current moderation run not found' USING ERRCODE = 'OT409';
  END IF;

  IF v_current_run_id IS DISTINCT FROM p_run_id THEN
    RAISE EXCEPTION 'stale or mismatched moderation run' USING ERRCODE = 'OT409';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM marketplace.listing_moderation_overrides AS override
    WHERE override.run_id = p_run_id
  ) THEN
    RAISE EXCEPTION 'moderation run already has a human decision' USING ERRCODE = 'OT409';
  END IF;

  v_override_decision := CASE v_decision
    WHEN 'approve' THEN 'allow'
    ELSE 'block'
  END;

  INSERT INTO marketplace.listing_moderation_overrides (
    run_id,
    moderator_user_id,
    decision,
    reason_code
  ) VALUES (
    p_run_id,
    v_moderator_user_id,
    v_override_decision,
    v_reason_code
  ) RETURNING id INTO v_override_id;

  SELECT *
  INTO v_lifecycle
  FROM public.review_listing_moderation(
    p_listing_id,
    v_decision,
    p_rejection_reason
  );

  RETURN QUERY SELECT
    v_override_id,
    v_lifecycle.listing_id,
    v_lifecycle.status,
    v_lifecycle.moderation_status,
    v_lifecycle.moderated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.review_listing_moderation_with_override(UUID, UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.review_listing_moderation_with_override(UUID, UUID, TEXT, TEXT, TEXT)
  TO authenticated;

COMMENT ON FUNCTION public.review_listing_moderation_with_override(UUID, UUID, TEXT, TEXT, TEXT) IS
  'AI-01G-D1A atomic admin-only human moderation decision: records immutable override history for the current run and executes the protected listing lifecycle in one transaction.';

NOTIFY pgrst, 'reload schema';

COMMIT;
