BEGIN;

-- JLC-0901: Jolcar dealer verification is a private, Kazakhstan-specific
-- trust record attached to the existing account/profile identity. It does not
-- create a second authentication system or expose business/contact evidence.
CREATE TABLE marketplace.dealer_verification_profiles (
  dealer_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending',
  legal_entity_kind TEXT NOT NULL,
  business_registration_identifier TEXT NOT NULL,
  verified_phone_contact_id UUID NOT NULL REFERENCES identity.verified_seller_contact_phones(id) ON DELETE RESTRICT,
  dealer_trade_name TEXT NOT NULL,
  city TEXT NOT NULL,
  authorized_representative_name TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dealer_verification_profiles_status_chk CHECK (status IN ('pending', 'verified', 'rejected', 'suspended')),
  CONSTRAINT dealer_verification_profiles_legal_entity_kind_chk CHECK (legal_entity_kind IN ('legal_entity', 'individual_entrepreneur')),
  CONSTRAINT dealer_verification_profiles_registration_identifier_chk CHECK (business_registration_identifier ~ '^[0-9]{12}$'),
  CONSTRAINT dealer_verification_profiles_trade_name_chk CHECK (char_length(btrim(dealer_trade_name)) BETWEEN 1 AND 200),
  CONSTRAINT dealer_verification_profiles_city_chk CHECK (char_length(btrim(city)) BETWEEN 1 AND 120),
  CONSTRAINT dealer_verification_profiles_representative_chk CHECK (char_length(btrim(authorized_representative_name)) BETWEEN 1 AND 200),
  CONSTRAINT dealer_verification_profiles_review_note_chk CHECK (review_note IS NULL OR char_length(btrim(review_note)) BETWEEN 1 AND 2000),
  CONSTRAINT dealer_verification_profiles_review_fields_chk CHECK (
    (status = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL AND review_note IS NULL)
    OR (status IN ('verified', 'rejected', 'suspended') AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
  )
);

CREATE TABLE marketplace.dealer_verification_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES marketplace.dealer_verification_profiles(dealer_id) ON DELETE RESTRICT,
  previous_status TEXT,
  next_status TEXT NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dealer_verification_transitions_status_chk CHECK (next_status IN ('pending', 'verified', 'rejected', 'suspended')),
  CONSTRAINT dealer_verification_transitions_changed_chk CHECK ((previous_status IS NULL AND next_status = 'pending') OR (previous_status IS NOT NULL AND previous_status <> next_status)),
  CONSTRAINT dealer_verification_transitions_note_chk CHECK (review_note IS NULL OR char_length(btrim(review_note)) BETWEEN 1 AND 2000)
);

CREATE INDEX dealer_verification_profiles_status_idx ON marketplace.dealer_verification_profiles (status, submitted_at ASC);
CREATE INDEX dealer_verification_transitions_dealer_created_idx ON marketplace.dealer_verification_transitions (dealer_id, created_at DESC);

CREATE TRIGGER dealer_verification_profiles_set_updated_at
  BEFORE UPDATE ON marketplace.dealer_verification_profiles
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

CREATE OR REPLACE FUNCTION marketplace.submit_own_dealer_verification(
  p_legal_entity_kind TEXT,
  p_business_registration_identifier TEXT,
  p_verified_phone_contact_id UUID,
  p_dealer_trade_name TEXT,
  p_city TEXT,
  p_authorized_representative_name TEXT
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, identity, auth, pg_catalog
AS $$
DECLARE v_dealer_id UUID := auth.uid();
BEGIN
  IF v_dealer_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF p_legal_entity_kind NOT IN ('legal_entity', 'individual_entrepreneur')
    OR COALESCE(btrim(p_business_registration_identifier), '') !~ '^[0-9]{12}$'
    OR char_length(COALESCE(btrim(p_dealer_trade_name), '')) NOT BETWEEN 1 AND 200
    OR char_length(COALESCE(btrim(p_city), '')) NOT BETWEEN 1 AND 120
    OR char_length(COALESCE(btrim(p_authorized_representative_name), '')) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'invalid dealer verification submission' USING ERRCODE = 'OT422';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_dealer_id AND seller_type = 'dealer') THEN
    RAISE EXCEPTION 'dealer profile required' USING ERRCODE = 'OT403';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM identity.verified_seller_contact_phones contact
    WHERE contact.id = p_verified_phone_contact_id AND contact.user_id = v_dealer_id
      AND contact.is_active AND contact.revoked_at IS NULL
  ) THEN RAISE EXCEPTION 'active verified dealer phone required' USING ERRCODE = 'OT422'; END IF;
  IF EXISTS (SELECT 1 FROM marketplace.dealer_verification_profiles WHERE dealer_id = v_dealer_id) THEN
    RAISE EXCEPTION 'dealer verification already submitted' USING ERRCODE = 'OT409';
  END IF;

  INSERT INTO marketplace.dealer_verification_profiles (
    dealer_id, legal_entity_kind, business_registration_identifier, verified_phone_contact_id,
    dealer_trade_name, city, authorized_representative_name
  ) VALUES (
    v_dealer_id, p_legal_entity_kind, btrim(p_business_registration_identifier), p_verified_phone_contact_id,
    btrim(p_dealer_trade_name), btrim(p_city), btrim(p_authorized_representative_name)
  );
  INSERT INTO marketplace.dealer_verification_transitions (dealer_id, previous_status, next_status, actor_user_id)
  VALUES (v_dealer_id, NULL, 'pending', v_dealer_id);
  RETURN 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.review_dealer_verification(
  p_dealer_id UUID,
  p_next_status TEXT,
  p_review_note TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, identity, auth, pg_catalog
AS $$
DECLARE v_actor_id UUID := auth.uid(); v_previous_status TEXT;
BEGIN
  IF v_actor_id IS NULL OR COALESCE(public.admin_role(v_actor_id), '') NOT IN ('owner', 'admin', 'moderator') THEN
    RAISE EXCEPTION 'authorized dealer reviewer required' USING ERRCODE = 'OT403';
  END IF;
  IF p_next_status NOT IN ('verified', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'invalid dealer verification outcome' USING ERRCODE = 'OT422';
  END IF;
  SELECT status INTO v_previous_status FROM marketplace.dealer_verification_profiles WHERE dealer_id = p_dealer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'dealer verification not found' USING ERRCODE = 'OT404'; END IF;
  IF NOT ((v_previous_status = 'pending' AND p_next_status IN ('verified', 'rejected'))
       OR (v_previous_status = 'verified' AND p_next_status = 'suspended')
       OR (v_previous_status = 'suspended' AND p_next_status IN ('verified', 'rejected'))) THEN
    RAISE EXCEPTION 'invalid dealer verification transition from % to %', v_previous_status, p_next_status USING ERRCODE = 'OT422';
  END IF;
  UPDATE marketplace.dealer_verification_profiles
  SET status = p_next_status, reviewed_at = NOW(), reviewed_by = v_actor_id, review_note = NULLIF(btrim(p_review_note), '')
  WHERE dealer_id = p_dealer_id;
  INSERT INTO marketplace.dealer_verification_transitions (dealer_id, previous_status, next_status, actor_user_id, review_note)
  VALUES (p_dealer_id, v_previous_status, p_next_status, v_actor_id, NULLIF(btrim(p_review_note), ''));
  INSERT INTO public.admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (v_actor_id, 'dealer_verification.transition', 'dealer_verification', p_dealer_id,
    jsonb_build_object('previous_status', v_previous_status, 'next_status', p_next_status));
  RETURN p_next_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_verified_dealer(p_dealer_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, marketplace, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM marketplace.dealer_verification_profiles verification
    JOIN public.profiles dealer ON dealer.id = verification.dealer_id
    WHERE verification.dealer_id = p_dealer_id AND verification.status = 'verified' AND dealer.seller_type = 'dealer'
  );
$$;

ALTER TABLE marketplace.dealer_verification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.dealer_verification_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY dealer_verification_profiles_select_owner_or_reviewer ON marketplace.dealer_verification_profiles
  FOR SELECT TO authenticated USING (dealer_id = auth.uid() OR public.admin_role(auth.uid()) IN ('owner', 'admin', 'moderator'));
CREATE POLICY dealer_verification_profiles_service_role_all ON marketplace.dealer_verification_profiles
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY dealer_verification_transitions_select_reviewer ON marketplace.dealer_verification_transitions
  FOR SELECT TO authenticated USING (public.admin_role(auth.uid()) IN ('owner', 'admin', 'moderator'));
CREATE POLICY dealer_verification_transitions_service_role_all ON marketplace.dealer_verification_transitions
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

REVOKE ALL ON TABLE marketplace.dealer_verification_profiles, marketplace.dealer_verification_transitions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE marketplace.dealer_verification_profiles, marketplace.dealer_verification_transitions TO authenticated;
GRANT ALL ON TABLE marketplace.dealer_verification_profiles, marketplace.dealer_verification_transitions TO service_role;
REVOKE ALL ON FUNCTION marketplace.submit_own_dealer_verification(TEXT, TEXT, UUID, TEXT, TEXT, TEXT), marketplace.review_dealer_verification(UUID, TEXT, TEXT), public.is_verified_dealer(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.submit_own_dealer_verification(TEXT, TEXT, UUID, TEXT, TEXT, TEXT), marketplace.review_dealer_verification(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_verified_dealer(UUID) TO anon, authenticated, service_role;

COMMENT ON TABLE marketplace.dealer_verification_profiles IS 'Private Jolcar dealer verification record tied to the existing account identity. Do not expose registration, contact, city, representative, or review data publicly.';
COMMENT ON FUNCTION public.is_verified_dealer(UUID) IS 'Public-safe derived dealer verification signal; never exposes the private verification record.';

NOTIFY pgrst, 'reload schema';
COMMIT;
