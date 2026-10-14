-- JLC-0706: fail closed when an authenticated user has no admin role.
BEGIN;

CREATE OR REPLACE FUNCTION public.moderate_vehicle_owner_review(
  p_review_id UUID,
  p_decision TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (review_id UUID, moderation_status vehicle.review_moderation_status)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, vehicle, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid(); v_decision TEXT := lower(btrim(COALESCE(p_decision, ''))); v_reason TEXT := NULLIF(btrim(COALESCE(p_reason, '')), ''); v_previous vehicle.review_moderation_status; v_next vehicle.review_moderation_status;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF COALESCE(public.admin_role(v_actor), '') NOT IN ('owner', 'admin', 'moderator') THEN RAISE EXCEPTION 'admin authorization required' USING ERRCODE = 'OT403'; END IF;
  IF v_decision NOT IN ('approve', 'reject', 'hide', 'restore') THEN RAISE EXCEPTION 'invalid review decision' USING ERRCODE = 'OT422'; END IF;
  IF v_reason IS NOT NULL AND char_length(v_reason) > 1000 THEN RAISE EXCEPTION 'review moderation reason is too long' USING ERRCODE = 'OT422'; END IF;
  IF v_decision IN ('reject', 'hide') AND v_reason IS NULL THEN RAISE EXCEPTION 'moderation reason is required' USING ERRCODE = 'OT422'; END IF;
  SELECT review.moderation_status INTO v_previous FROM vehicle.owner_reviews AS review WHERE review.id = p_review_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'vehicle review not found' USING ERRCODE = 'OT404'; END IF;
  v_next := CASE v_decision WHEN 'approve' THEN 'approved'::vehicle.review_moderation_status WHEN 'restore' THEN 'approved'::vehicle.review_moderation_status ELSE 'rejected'::vehicle.review_moderation_status END;
  IF NOT ((v_decision = 'approve' AND v_previous = 'pending') OR (v_decision = 'reject' AND v_previous = 'pending') OR (v_decision = 'hide' AND v_previous = 'approved') OR (v_decision = 'restore' AND v_previous = 'rejected')) THEN RAISE EXCEPTION 'invalid vehicle review moderation transition' USING ERRCODE = 'OT409'; END IF;
  UPDATE vehicle.owner_reviews AS review SET moderation_status = v_next, updated_at = now() WHERE review.id = p_review_id;
  INSERT INTO vehicle.owner_review_moderation_events (review_id, actor_user_id, previous_status, next_status, action, reason) VALUES (p_review_id, v_actor, v_previous, v_next, v_decision, v_reason);
  INSERT INTO public.admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES (v_actor, 'vehicle_review.' || v_decision, 'vehicle.owner_review', p_review_id, jsonb_build_object('previous_status', v_previous, 'next_status', v_next));
  RETURN QUERY SELECT p_review_id, v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_vehicle_owner_review(UUID, TEXT, TEXT) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_vehicle_owner_review(UUID, TEXT, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
