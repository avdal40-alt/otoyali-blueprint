BEGIN;

CREATE TABLE vehicle.owner_review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES vehicle.owner_reviews(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT owner_review_reports_reason_chk CHECK (reason IN ('spam', 'abuse', 'wrong_information', 'duplicate', 'other')),
  CONSTRAINT owner_review_reports_details_chk CHECK (details IS NULL OR char_length(trim(details)) BETWEEN 1 AND 1000),
  CONSTRAINT owner_review_reports_one_per_reporter_chk UNIQUE (review_id, reporter_id)
);

CREATE INDEX owner_review_reports_review_idx ON vehicle.owner_review_reports (review_id, created_at DESC);

ALTER TABLE vehicle.owner_review_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_review_reports_insert_own
  ON vehicle.owner_review_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND NOT EXISTS (
    SELECT 1 FROM vehicle.owner_reviews r WHERE r.id = review_id AND r.author_id = auth.uid()
  ));
CREATE POLICY owner_review_reports_select_own
  ON vehicle.owner_review_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY owner_review_reports_service_role_all
  ON vehicle.owner_review_reports FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

GRANT SELECT, INSERT ON vehicle.owner_review_reports TO authenticated;
GRANT ALL ON vehicle.owner_review_reports TO service_role;

CREATE OR REPLACE FUNCTION public.moderate_vehicle_owner_review(
  p_review_id UUID,
  p_decision TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (review_id UUID, moderation_status vehicle.review_moderation_status)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vehicle, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_decision TEXT := lower(btrim(COALESCE(p_decision, '')));
  v_status vehicle.review_moderation_status;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF NOT public.is_admin(v_actor) THEN RAISE EXCEPTION 'admin authorization required' USING ERRCODE = 'OT403'; END IF;
  IF v_decision NOT IN ('approve', 'reject') THEN RAISE EXCEPTION 'invalid review decision' USING ERRCODE = 'OT422'; END IF;
  IF v_decision = 'reject' AND char_length(trim(COALESCE(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'rejection reason is required' USING ERRCODE = 'OT422';
  END IF;

  v_status := CASE WHEN v_decision = 'approve' THEN 'approved'::vehicle.review_moderation_status ELSE 'rejected'::vehicle.review_moderation_status END;
  UPDATE vehicle.owner_reviews SET moderation_status = v_status, updated_at = NOW()
    WHERE id = p_review_id AND moderation_status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'review not found or already moderated' USING ERRCODE = 'OT409'; END IF;
  INSERT INTO public.admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    VALUES (v_actor, 'vehicle_review_' || v_decision, 'vehicle.owner_review', p_review_id,
      jsonb_build_object('reason', NULLIF(trim(p_reason), '')));
  RETURN QUERY SELECT p_review_id, v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_vehicle_owner_review(UUID, TEXT, TEXT) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_vehicle_owner_review(UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
