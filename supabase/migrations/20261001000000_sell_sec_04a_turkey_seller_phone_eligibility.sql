BEGIN;

-- SELL-SEC-04A: seller eligibility is a distinct, private trust fact. This
-- table stores only the current authoritative Turkey seller contact; Auth
-- identity phones in public.profiles remain independent and internationally
-- valid.
CREATE TABLE identity.seller_phone_verifications (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT seller_phone_verifications_turkey_e164_chk
    CHECK (phone_e164 ~ '^\\+90[1-9][0-9]{9}$')
);

COMMENT ON TABLE identity.seller_phone_verifications IS
  'Private current seller-purpose verified Turkey phone. It is not an Auth identity phone and is never publicly selectable.';
COMMENT ON COLUMN identity.seller_phone_verifications.phone_e164 IS
  'Canonical E.164 +90 seller contact, recorded only after trusted seller-purpose OTP verification.';

CREATE TRIGGER seller_phone_verifications_set_updated_at
  BEFORE UPDATE ON identity.seller_phone_verifications
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

-- This is deliberately service-role-only: SELL-SEC-04B must call it only
-- after server-owned OTP proof succeeds. The upsert keeps the old contact
-- authoritative until that proof exists and this operation succeeds.
CREATE FUNCTION identity.record_verified_turkey_seller_phone(
  p_user_id UUID,
  p_phone_e164 TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = identity, auth, pg_catalog
AS $$
BEGIN
  IF p_user_id IS NULL
     OR p_phone_e164 IS NULL
     OR p_phone_e164 !~ '^\+90[1-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'invalid verified Turkey seller phone' USING ERRCODE = '22023';
  END IF;

  INSERT INTO identity.seller_phone_verifications (user_id, phone_e164, verified_at)
  VALUES (p_user_id, p_phone_e164, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET phone_e164 = EXCLUDED.phone_e164,
        verified_at = EXCLUDED.verified_at;
END;
$$;

-- Canonical caller-facing seller eligibility primitive. It has no user-id
-- input, returns no phone, and derives the actor exclusively from auth.uid().
CREATE FUNCTION public.is_turkey_seller_phone_verified()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = identity, auth, pg_catalog
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM identity.seller_phone_verifications AS verification
      WHERE verification.user_id = auth.uid()
        AND verification.phone_e164 ~ '^\+90[1-9][0-9]{9}$'
    );
$$;

COMMENT ON FUNCTION identity.record_verified_turkey_seller_phone(UUID, TEXT) IS
  'Trusted service-only replacement operation for a seller-purpose OTP success. Never grant to browser roles.';
COMMENT ON FUNCTION public.is_turkey_seller_phone_verified() IS
  'Current authenticated actor eligibility for Turkey selling based on a private seller-purpose +90 verification.';

ALTER TABLE identity.seller_phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY seller_phone_verifications_service_role_all
  ON identity.seller_phone_verifications FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

REVOKE ALL ON TABLE identity.seller_phone_verifications FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE identity.seller_phone_verifications TO service_role;

REVOKE ALL ON FUNCTION identity.record_verified_turkey_seller_phone(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION identity.record_verified_turkey_seller_phone(UUID, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.is_turkey_seller_phone_verified() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_turkey_seller_phone_verified() TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
