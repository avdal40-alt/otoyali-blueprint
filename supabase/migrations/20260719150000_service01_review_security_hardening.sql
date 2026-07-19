-- SERVICE-01 review RPC security hardening.
-- Keeps service_marketplace private while enforcing database-level moderation
-- transitions through the existing public RPC contract.

CREATE OR REPLACE FUNCTION public.review_service_provider_application(
  p_application_id UUID,
  p_decision TEXT,
  p_review_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  application_id UUID,
  status TEXT,
  reviewed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_decision TEXT := lower(btrim(COALESCE(p_decision, '')));
  v_review_note TEXT := NULLIF(regexp_replace(btrim(COALESCE(p_review_note, '')), '\s+', ' ', 'g'), '');
  v_previous_status TEXT;
  v_application_id UUID;
  v_status TEXT;
  v_reviewed_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  IF NOT public.is_admin(v_user_id) THEN
    RAISE EXCEPTION 'admin authorization required' USING ERRCODE = 'OT403';
  END IF;

  IF p_application_id IS NULL THEN
    RAISE EXCEPTION 'application_id is required' USING ERRCODE = 'OT422';
  END IF;

  IF v_decision NOT IN ('reviewing', 'approved', 'rejected', 'archived') THEN
    RAISE EXCEPTION 'unsupported decision' USING ERRCODE = 'OT422';
  END IF;

  IF v_decision IN ('rejected', 'archived') AND v_review_note IS NULL THEN
    RAISE EXCEPTION 'review_note is required' USING ERRCODE = 'OT422';
  END IF;

  IF v_review_note IS NOT NULL AND char_length(v_review_note) > 1600 THEN
    RAISE EXCEPTION 'review_note is too long' USING ERRCODE = 'OT422';
  END IF;

  SELECT application.status
  INTO v_previous_status
  FROM service_marketplace.provider_applications application
  WHERE application.id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'service provider application not found' USING ERRCODE = 'OT404';
  END IF;

  IF NOT (
    (v_previous_status = 'pending_review' AND v_decision IN ('reviewing', 'approved', 'rejected', 'archived'))
    OR (v_previous_status = 'reviewing' AND v_decision IN ('approved', 'rejected', 'archived'))
  ) THEN
    RAISE EXCEPTION 'illegal service provider application status transition' USING ERRCODE = 'OT409';
  END IF;

  UPDATE service_marketplace.provider_applications application
  SET
    status = v_decision,
    moderation_note = v_review_note,
    reviewed_by = v_user_id,
    reviewed_at = now()
  WHERE application.id = p_application_id
    AND application.status = v_previous_status
  RETURNING
    application.id,
    application.status,
    application.reviewed_at
  INTO
    v_application_id,
    v_status,
    v_reviewed_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'service provider application status changed during review' USING ERRCODE = 'OT409';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_user_id,
    v_decision || '_service_application',
    'service_provider_application',
    p_application_id,
    jsonb_build_object(
      'note', v_review_note,
      'previous_status', v_previous_status,
      'new_status', v_status
    )
  );

  RETURN QUERY SELECT v_application_id, v_status, v_reviewed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.review_service_provider_application(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_service_provider_application(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.review_service_provider_application(UUID, TEXT, TEXT) IS
  'Admin-only service provider application moderation RPC. Enforces legal transitions from pending_review to reviewing/approved/rejected/archived and from reviewing to approved/rejected/archived, then returns only application_id, status, and reviewed_at.';

NOTIFY pgrst, 'reload schema';
