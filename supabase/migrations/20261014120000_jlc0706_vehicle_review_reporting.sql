-- JLC-0706: private reporting and authorized, auditable owner-review moderation.
BEGIN;

CREATE TABLE vehicle.owner_review_moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES vehicle.owner_reviews(id) ON DELETE RESTRICT,
  actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  previous_status vehicle.review_moderation_status NOT NULL,
  next_status vehicle.review_moderation_status NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'hide', 'restore')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT owner_review_moderation_events_reason_chk CHECK (reason IS NULL OR char_length(btrim(reason)) BETWEEN 1 AND 1000)
);

CREATE INDEX owner_review_moderation_events_review_created_idx
  ON vehicle.owner_review_moderation_events (review_id, created_at DESC, id DESC);

ALTER TABLE vehicle.owner_review_moderation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_review_moderation_events_select_reviewer
  ON vehicle.owner_review_moderation_events FOR SELECT TO authenticated
  USING (public.admin_role(auth.uid()) IN ('owner', 'admin', 'moderator'));
CREATE POLICY owner_reviews_select_reviewer
  ON vehicle.owner_reviews FOR SELECT TO authenticated
  USING (public.admin_role(auth.uid()) IN ('owner', 'admin', 'moderator'));
CREATE POLICY owner_review_reports_select_reviewer
  ON vehicle.owner_review_reports FOR SELECT TO authenticated
  USING (public.admin_role(auth.uid()) IN ('owner', 'admin', 'moderator'));
CREATE POLICY owner_review_moderation_events_service_role_all
  ON vehicle.owner_review_moderation_events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

REVOKE ALL ON TABLE vehicle.owner_review_reports, vehicle.owner_review_moderation_events FROM anon, authenticated;
GRANT SELECT ON TABLE vehicle.owner_review_reports, vehicle.owner_review_moderation_events TO authenticated;
GRANT ALL ON TABLE vehicle.owner_review_reports, vehicle.owner_review_moderation_events TO service_role;

CREATE OR REPLACE FUNCTION public.report_vehicle_owner_review(
  p_review_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, vehicle, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_reason TEXT := lower(btrim(COALESCE(p_reason, '')));
  v_details TEXT := NULLIF(btrim(COALESCE(p_details, '')), '');
  v_inserted BOOLEAN := FALSE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF v_reason NOT IN ('spam', 'abuse', 'wrong_information', 'duplicate', 'other') THEN
    RAISE EXCEPTION 'invalid vehicle review report reason' USING ERRCODE = 'OT422'; END IF;
  IF v_details IS NOT NULL AND char_length(v_details) > 1000 THEN
    RAISE EXCEPTION 'vehicle review report details are too long' USING ERRCODE = 'OT422'; END IF;
  IF EXISTS (SELECT 1 FROM vehicle.owner_review_reports WHERE reporter_id = v_actor AND created_at >= now() - interval '24 hours' HAVING count(*) >= 15) THEN
    RAISE EXCEPTION 'vehicle review report limit reached' USING ERRCODE = 'OT429'; END IF;
  IF NOT EXISTS (SELECT 1 FROM vehicle.owner_reviews WHERE id = p_review_id AND moderation_status = 'approved' AND author_id <> v_actor) THEN
    RAISE EXCEPTION 'reportable vehicle review not found' USING ERRCODE = 'OT404'; END IF;
  INSERT INTO vehicle.owner_review_reports (review_id, reporter_id, reason, details)
  VALUES (p_review_id, v_actor, v_reason, v_details)
  ON CONFLICT (review_id, reporter_id) DO NOTHING
  RETURNING TRUE INTO v_inserted;
  RETURN COALESCE(v_inserted, FALSE);
END;
$$;

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
  v_actor UUID := auth.uid();
  v_decision TEXT := lower(btrim(COALESCE(p_decision, '')));
  v_reason TEXT := NULLIF(btrim(COALESCE(p_reason, '')), '');
  v_previous vehicle.review_moderation_status;
  v_next vehicle.review_moderation_status;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF public.admin_role(v_actor) NOT IN ('owner', 'admin', 'moderator') THEN RAISE EXCEPTION 'admin authorization required' USING ERRCODE = 'OT403'; END IF;
  IF v_decision NOT IN ('approve', 'reject', 'hide', 'restore') THEN RAISE EXCEPTION 'invalid review decision' USING ERRCODE = 'OT422'; END IF;
  IF v_reason IS NOT NULL AND char_length(v_reason) > 1000 THEN RAISE EXCEPTION 'review moderation reason is too long' USING ERRCODE = 'OT422'; END IF;
  IF v_decision IN ('reject', 'hide') AND v_reason IS NULL THEN RAISE EXCEPTION 'moderation reason is required' USING ERRCODE = 'OT422'; END IF;
  SELECT moderation_status INTO v_previous FROM vehicle.owner_reviews WHERE id = p_review_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'vehicle review not found' USING ERRCODE = 'OT404'; END IF;
  v_next := CASE v_decision WHEN 'approve' THEN 'approved'::vehicle.review_moderation_status WHEN 'restore' THEN 'approved'::vehicle.review_moderation_status ELSE 'rejected'::vehicle.review_moderation_status END;
  IF NOT ((v_decision = 'approve' AND v_previous = 'pending') OR (v_decision = 'reject' AND v_previous = 'pending') OR (v_decision = 'hide' AND v_previous = 'approved') OR (v_decision = 'restore' AND v_previous = 'rejected')) THEN
    RAISE EXCEPTION 'invalid vehicle review moderation transition' USING ERRCODE = 'OT409'; END IF;
  UPDATE vehicle.owner_reviews SET moderation_status = v_next, updated_at = now() WHERE id = p_review_id;
  INSERT INTO vehicle.owner_review_moderation_events (review_id, actor_user_id, previous_status, next_status, action, reason)
  VALUES (p_review_id, v_actor, v_previous, v_next, v_decision, v_reason);
  INSERT INTO public.admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (v_actor, 'vehicle_review.' || v_decision, 'vehicle.owner_review', p_review_id, jsonb_build_object('previous_status', v_previous, 'next_status', v_next));
  RETURN QUERY SELECT p_review_id, v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.report_vehicle_owner_review(UUID, TEXT, TEXT), public.moderate_vehicle_owner_review(UUID, TEXT, TEXT) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.report_vehicle_owner_review(UUID, TEXT, TEXT), public.moderate_vehicle_owner_review(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON TABLE vehicle.owner_review_moderation_events IS 'Private append-only review moderation history. It must never be exposed on public review reads.';
COMMENT ON FUNCTION public.report_vehicle_owner_review(UUID, TEXT, TEXT) IS 'Authenticated public-review report facade. Reporter identity and report details remain private.';
NOTIFY pgrst, 'reload schema';
COMMIT;
