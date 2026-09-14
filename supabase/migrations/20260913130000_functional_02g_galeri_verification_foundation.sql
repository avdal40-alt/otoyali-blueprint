BEGIN;

-- FUNCTIONAL-02G: Galeri classification and verification are distinct trust
-- facts. This table is private; the only public-facing primitive is the
-- derived boolean predicate below.
CREATE TYPE marketplace.galeri_verification_status AS ENUM ('pending', 'verified', 'rejected');

CREATE TABLE marketplace.galeri_verifications (
  dealer_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status marketplace.galeri_verification_status NOT NULL DEFAULT 'pending',
  evidence_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT galeri_verifications_evidence_object_chk CHECK (jsonb_typeof(evidence_metadata) = 'object'),
  CONSTRAINT galeri_verifications_evidence_size_chk CHECK (pg_column_size(evidence_metadata) <= 16384),
  CONSTRAINT galeri_verifications_review_fields_chk CHECK (
    (status = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL AND review_note IS NULL)
    OR (status IN ('verified', 'rejected') AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
  ),
  CONSTRAINT galeri_verifications_review_note_chk CHECK (
    review_note IS NULL OR char_length(btrim(review_note)) BETWEEN 1 AND 2000
  )
);

COMMENT ON TABLE marketplace.galeri_verifications IS
  'Private canonical Galeri verification state and evidence metadata. Never expose evidence or review details through public projections.';
COMMENT ON COLUMN marketplace.galeri_verifications.evidence_metadata IS
  'Private bounded verification evidence metadata and document references; document contents are not stored here.';

CREATE TABLE marketplace.galeri_verification_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES marketplace.galeri_verifications(dealer_id) ON DELETE RESTRICT,
  previous_status marketplace.galeri_verification_status,
  next_status marketplace.galeri_verification_status NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT galeri_verification_transitions_changed_chk CHECK (
    (previous_status IS NULL AND next_status = 'pending')
    OR (previous_status IS NOT NULL AND previous_status <> next_status)
  ),
  CONSTRAINT galeri_verification_transitions_note_chk CHECK (
    review_note IS NULL OR char_length(btrim(review_note)) BETWEEN 1 AND 2000
  )
);

COMMENT ON TABLE marketplace.galeri_verification_transitions IS
  'Private append-only audit history for platform-authorized Galeri verification transitions.';

CREATE INDEX galeri_verifications_status_idx
  ON marketplace.galeri_verifications (status, submitted_at ASC);
CREATE INDEX galeri_verification_transitions_dealer_created_idx
  ON marketplace.galeri_verification_transitions (dealer_id, created_at DESC);

CREATE TRIGGER galeri_verifications_set_updated_at
  BEFORE UPDATE ON marketplace.galeri_verifications
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

-- Owners submit once through this controlled function. The function never
-- accepts a state or reviewer field, so direct API calls cannot self-verify.
CREATE OR REPLACE FUNCTION marketplace.submit_galeri_verification(
  p_evidence_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS marketplace.galeri_verification_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_dealer_id UUID := auth.uid();
BEGIN
  IF v_dealer_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

  IF jsonb_typeof(p_evidence_metadata) <> 'object' THEN
    RAISE EXCEPTION 'verification evidence metadata must be an object' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_dealer_id AND seller_type = 'dealer'
  ) THEN
    RAISE EXCEPTION 'Galeri verification requires dealer seller type' USING ERRCODE = '42501';
  END IF;

  INSERT INTO marketplace.galeri_verifications (dealer_id, evidence_metadata)
  VALUES (v_dealer_id, p_evidence_metadata);

  INSERT INTO marketplace.galeri_verification_transitions
    (dealer_id, previous_status, next_status, actor_user_id)
  VALUES
    (v_dealer_id, NULL, 'pending', v_dealer_id);

  RETURN 'pending';
END;
$$;

-- Only the established owner/admin/moderator authority can transition a
-- verification. The state machine intentionally permits a verified Galeri to
-- be rejected (revoked), but does not permit direct restoration or reopening.
CREATE OR REPLACE FUNCTION marketplace.review_galeri_verification(
  p_dealer_id UUID,
  p_next_status marketplace.galeri_verification_status,
  p_review_note TEXT DEFAULT NULL
)
RETURNS marketplace.galeri_verification_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_previous_status marketplace.galeri_verification_status;
BEGIN
  IF v_actor_id IS NULL
     OR COALESCE(public.admin_role(v_actor_id), '') NOT IN ('owner', 'admin', 'moderator') THEN
    RAISE EXCEPTION 'authorized Galeri reviewer required' USING ERRCODE = '42501';
  END IF;

  IF p_next_status NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'review outcome must be verified or rejected' USING ERRCODE = '22023';
  END IF;

  SELECT status INTO v_previous_status
  FROM marketplace.galeri_verifications
  WHERE dealer_id = p_dealer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Galeri verification not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    (v_previous_status = 'pending' AND p_next_status IN ('verified', 'rejected'))
    OR (v_previous_status = 'verified' AND p_next_status = 'rejected')
  ) THEN
    RAISE EXCEPTION 'invalid Galeri verification transition from % to %', v_previous_status, p_next_status USING ERRCODE = '22023';
  END IF;

  UPDATE marketplace.galeri_verifications
  SET status = p_next_status,
      reviewed_at = NOW(),
      reviewed_by = v_actor_id,
      review_note = NULLIF(btrim(p_review_note), '')
  WHERE dealer_id = p_dealer_id;

  INSERT INTO marketplace.galeri_verification_transitions
    (dealer_id, previous_status, next_status, actor_user_id, review_note)
  VALUES
    (p_dealer_id, v_previous_status, p_next_status, v_actor_id, NULLIF(btrim(p_review_note), ''));

  INSERT INTO public.admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_actor_id,
    'galeri_verification.transition',
    'galeri_verification',
    p_dealer_id,
    jsonb_build_object('previous_status', v_previous_status, 'next_status', p_next_status)
  );

  RETURN p_next_status;
END;
$$;

-- This is the sole public-safe signal. It derives from protected state and
-- remains false when a trusted dealer classification no longer applies.
CREATE OR REPLACE FUNCTION public.is_verified_galeri(p_dealer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, marketplace, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM marketplace.galeri_verifications AS verification
    JOIN public.profiles AS dealer ON dealer.id = verification.dealer_id
    WHERE verification.dealer_id = p_dealer_id
      AND verification.status = 'verified'
      AND dealer.seller_type = 'dealer'
  );
$$;

COMMENT ON FUNCTION public.is_verified_galeri(UUID) IS
  'Public-safe derived verification signal and server-side prerequisite for Galeri-only capabilities; never reveals evidence or non-verified status.';

REVOKE ALL ON FUNCTION marketplace.submit_galeri_verification(JSONB) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.review_galeri_verification(UUID, marketplace.galeri_verification_status, TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_verified_galeri(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.submit_galeri_verification(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION marketplace.review_galeri_verification(UUID, marketplace.galeri_verification_status, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_verified_galeri(UUID) TO anon, authenticated, service_role;

ALTER TABLE marketplace.galeri_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.galeri_verification_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY galeri_verifications_select_own
  ON marketplace.galeri_verifications FOR SELECT TO authenticated
  USING (dealer_id = auth.uid());
CREATE POLICY galeri_verifications_select_reviewers
  ON marketplace.galeri_verifications FOR SELECT TO authenticated
  USING (public.admin_role(auth.uid()) IN ('owner', 'admin', 'moderator'));
CREATE POLICY galeri_verifications_service_role_all
  ON marketplace.galeri_verifications FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY galeri_verification_transitions_select_reviewers
  ON marketplace.galeri_verification_transitions FOR SELECT TO authenticated
  USING (public.admin_role(auth.uid()) IN ('owner', 'admin', 'moderator'));
CREATE POLICY galeri_verification_transitions_service_role_all
  ON marketplace.galeri_verification_transitions FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

REVOKE ALL ON TABLE marketplace.galeri_verifications, marketplace.galeri_verification_transitions
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE marketplace.galeri_verifications, marketplace.galeri_verification_transitions TO authenticated;
GRANT ALL ON TABLE marketplace.galeri_verifications, marketplace.galeri_verification_transitions TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
