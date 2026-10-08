BEGIN;

-- B01A: private workflow state only. Supabase Auth remains the sole password
-- authority; this table contains neither passwords nor password-derived data.
CREATE TABLE identity.auth_password_enrollments (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  password_enrolled_at TIMESTAMPTZ NOT NULL,
  enrollment_method TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auth_password_enrollments_method_chk
    CHECK (enrollment_method IN ('registration', 'legacy_enrollment', 'recovery_reset'))
);

CREATE TRIGGER auth_password_enrollments_set_updated_at
  BEFORE UPDATE ON identity.auth_password_enrollments
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

ALTER TABLE identity.auth_password_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_password_enrollments_service_role_all
  ON identity.auth_password_enrollments FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);
REVOKE ALL ON TABLE identity.auth_password_enrollments FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE identity.auth_password_enrollments TO service_role;

CREATE FUNCTION public.get_own_password_enrollment_status()
RETURNS TABLE(password_enrolled BOOLEAN, password_enrolled_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  RETURN QUERY
  SELECT EXISTS (
    SELECT 1 FROM identity.auth_password_enrollments AS enrollment
    WHERE enrollment.user_id = v_user_id
  ), (
    SELECT enrollment.password_enrolled_at
    FROM identity.auth_password_enrollments AS enrollment
    WHERE enrollment.user_id = v_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_password_enrollment_status() FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_password_enrollment_status() TO authenticated;

CREATE TABLE identity.verified_seller_contact_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL,
  verification_source TEXT NOT NULL,
  is_current_account_phone BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT verified_seller_contact_phones_turkey_e164_chk
    CHECK (phone_e164 ~ '^[+]90[1-9][0-9]{9}$'),
  CONSTRAINT verified_seller_contact_phones_source_chk
    CHECK (verification_source IN ('auth_account_phone', 'seller_otp')),
  CONSTRAINT verified_seller_contact_phones_revocation_chk
    CHECK (revoked_at IS NULL OR NOT is_active),
  CONSTRAINT verified_seller_contact_phones_current_active_chk
    CHECK (NOT is_current_account_phone OR is_active)
);

CREATE TRIGGER verified_seller_contact_phones_set_updated_at
  BEFORE UPDATE ON identity.verified_seller_contact_phones
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

CREATE UNIQUE INDEX verified_seller_contact_phones_active_phone_unique_idx
  ON identity.verified_seller_contact_phones (phone_e164)
  WHERE is_active;
CREATE UNIQUE INDEX verified_seller_contact_phones_one_current_account_idx
  ON identity.verified_seller_contact_phones (user_id)
  WHERE is_active AND is_current_account_phone;
CREATE INDEX verified_seller_contact_phones_owner_active_idx
  ON identity.verified_seller_contact_phones (user_id, verified_at DESC, id)
  WHERE is_active;

ALTER TABLE identity.verified_seller_contact_phones ENABLE ROW LEVEL SECURITY;
CREATE POLICY verified_seller_contact_phones_service_role_all
  ON identity.verified_seller_contact_phones FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);
REVOKE ALL ON TABLE identity.verified_seller_contact_phones FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE identity.verified_seller_contact_phones TO service_role;

-- Each pre-existing legacy verification remains a verified contact. The legacy
-- table stays authoritative for legacy callers until the later frontend cutover.
INSERT INTO identity.verified_seller_contact_phones (
  user_id, phone_e164, verified_at, verification_source,
  is_current_account_phone, is_active, created_at, updated_at
)
SELECT legacy.user_id, legacy.phone_e164, legacy.verified_at, 'seller_otp',
       FALSE, TRUE, legacy.created_at, legacy.updated_at
FROM identity.seller_phone_verifications AS legacy
ON CONFLICT (phone_e164) WHERE is_active DO NOTHING;

-- Only trusted callers may create/promote contact facts. The advisory lock
-- serializes every active-contact transition for an owner before the count is
-- checked, including reactivation of an existing contact.
CREATE FUNCTION identity.upsert_verified_seller_contact_phone(
  p_user_id UUID,
  p_phone_e164 TEXT,
  p_verification_source TEXT,
  p_is_current_account_phone BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_contact_id UUID;
  v_contact_is_active BOOLEAN;
  v_other_owner UUID;
  v_active_count INTEGER;
BEGIN
  IF p_user_id IS NULL
     OR p_phone_e164 IS NULL
     OR p_phone_e164 !~ '^[+]90[1-9][0-9]{9}$'
     OR p_verification_source NOT IN ('auth_account_phone', 'seller_otp') THEN
    RAISE EXCEPTION 'invalid verified seller contact' USING ERRCODE = 'OT422';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(80410, pg_catalog.hashtext(p_user_id::TEXT));
  PERFORM pg_catalog.pg_advisory_xact_lock(80411, pg_catalog.hashtext(p_phone_e164));

  SELECT contact.user_id INTO v_other_owner
  FROM identity.verified_seller_contact_phones AS contact
  WHERE contact.phone_e164 = p_phone_e164
    AND contact.is_active
    AND contact.user_id <> p_user_id
  FOR UPDATE;
  IF FOUND THEN
    RAISE EXCEPTION 'verified seller contact belongs to another user' USING ERRCODE = 'OT409';
  END IF;

  SELECT contact.id, contact.is_active INTO v_contact_id, v_contact_is_active
  FROM identity.verified_seller_contact_phones AS contact
  WHERE contact.user_id = p_user_id
    AND contact.phone_e164 = p_phone_e164
  ORDER BY contact.created_at DESC, contact.id DESC
  LIMIT 1
  FOR UPDATE;

  IF p_is_current_account_phone THEN
    UPDATE identity.verified_seller_contact_phones AS contact
    SET is_current_account_phone = FALSE
    WHERE contact.user_id = p_user_id
      AND contact.is_active
      AND contact.is_current_account_phone
      AND contact.phone_e164 <> p_phone_e164;
  END IF;

  SELECT count(*)::INTEGER INTO v_active_count
  FROM identity.verified_seller_contact_phones AS contact
  WHERE contact.user_id = p_user_id
    AND contact.is_active
    AND (v_contact_id IS NULL OR contact.id <> v_contact_id);

  IF (v_contact_id IS NULL OR NOT COALESCE(v_contact_is_active, FALSE))
     AND v_active_count >= 3 THEN
    RAISE EXCEPTION 'active seller contact limit reached' USING ERRCODE = 'OT429';
  END IF;

  IF v_contact_id IS NULL THEN
    INSERT INTO identity.verified_seller_contact_phones (
      user_id, phone_e164, verified_at, verification_source,
      is_current_account_phone, is_active, revoked_at
    ) VALUES (
      p_user_id, p_phone_e164, NOW(), p_verification_source,
      p_is_current_account_phone, TRUE, NULL
    ) RETURNING id INTO v_contact_id;
  ELSE
    UPDATE identity.verified_seller_contact_phones AS contact
    SET verified_at = NOW(),
        verification_source = p_verification_source,
        is_current_account_phone = p_is_current_account_phone,
        is_active = TRUE,
        revoked_at = NULL
    WHERE contact.id = v_contact_id;
  END IF;

  RETURN v_contact_id;
END;
$$;

CREATE FUNCTION identity.require_active_seller_contact_phone(
  p_user_id UUID,
  p_contact_id UUID
)
RETURNS VOID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_user_id IS NULL OR p_contact_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM identity.verified_seller_contact_phones AS contact
    WHERE contact.id = p_contact_id
      AND contact.user_id = p_user_id
      AND contact.is_active
      AND contact.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'active seller contact required' USING ERRCODE = 'OT403';
  END IF;
END;
$$;

CREATE FUNCTION public.sync_own_verified_account_phone()
RETURNS TABLE(outcome TEXT, contact_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_phone_e164 TEXT;
  v_phone_confirmed_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  SELECT user_record.phone, user_record.phone_confirmed_at
  INTO v_phone_e164, v_phone_confirmed_at
  FROM auth.users AS user_record
  WHERE user_record.id = v_user_id;

  IF v_phone_e164 IS NULL THEN
    RETURN QUERY SELECT 'phone_missing'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  IF v_phone_confirmed_at IS NULL THEN
    RETURN QUERY SELECT 'phone_unconfirmed'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  -- GoTrue may persist a confirmed phone without the leading plus while the
  -- application contract stores canonical E.164. Normalize only that exact
  -- representation; do not accept arbitrary punctuation or national forms.
  IF v_phone_e164 ~ '^90[1-9][0-9]{9}$' THEN
    v_phone_e164 := '+' || v_phone_e164;
  END IF;
  IF v_phone_e164 !~ '^[+]90[1-9][0-9]{9}$' THEN
    RETURN QUERY SELECT 'phone_not_turkish'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  contact_id := identity.upsert_verified_seller_contact_phone(
    v_user_id, v_phone_e164, 'auth_account_phone', TRUE
  );
  RETURN QUERY SELECT 'synced'::TEXT, contact_id;
END;
$$;

CREATE FUNCTION public.list_own_verified_seller_contact_phones()
RETURNS TABLE(
  contact_id UUID,
  masked_phone TEXT,
  is_active BOOLEAN,
  is_current_account_phone BOOLEAN,
  verification_source TEXT,
  verified_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  RETURN QUERY
  SELECT contact.id,
         '+90 *** *** ' || right(contact.phone_e164, 4),
         contact.is_active,
         contact.is_current_account_phone,
         contact.verification_source,
         contact.verified_at
  FROM identity.verified_seller_contact_phones AS contact
  WHERE contact.user_id = v_user_id
  ORDER BY contact.is_active DESC, contact.is_current_account_phone DESC,
           contact.verified_at DESC, contact.id;
END;
$$;

REVOKE ALL ON FUNCTION identity.upsert_verified_seller_contact_phone(UUID, TEXT, TEXT, BOOLEAN), identity.require_active_seller_contact_phone(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION identity.upsert_verified_seller_contact_phone(UUID, TEXT, TEXT, BOOLEAN), identity.require_active_seller_contact_phone(UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.sync_own_verified_account_phone(), public.list_own_verified_seller_contact_phones() FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_own_verified_account_phone(), public.list_own_verified_seller_contact_phones() TO authenticated;

ALTER TABLE marketplace.listings
  ADD COLUMN seller_contact_phone_id UUID
  REFERENCES identity.verified_seller_contact_phones(id) ON DELETE SET NULL;
CREATE INDEX listings_seller_contact_phone_id_idx
  ON marketplace.listings (seller_contact_phone_id)
  WHERE seller_contact_phone_id IS NOT NULL;

UPDATE marketplace.listings AS listing
SET seller_contact_phone_id = contact.id
FROM identity.verified_seller_contact_phones AS contact
WHERE listing.seller_contact_phone_id IS NULL
  AND contact.user_id = listing.seller_id
  AND contact.is_active
  AND contact.verification_source = 'seller_otp';

CREATE FUNCTION public.create_own_listing_draft_v2(
  p_make_id UUID, p_model_id UUID, p_variant_id UUID, p_year SMALLINT,
  p_mileage_km INTEGER, p_condition TEXT, p_fuel_type vehicle.fuel_type,
  p_transmission vehicle.transmission_type, p_body_type TEXT, p_drive_type TEXT,
  p_color TEXT, p_engine_volume_l NUMERIC, p_damage_state TEXT,
  p_owner_count SMALLINT, p_description TEXT, p_price_amount_text TEXT,
  p_currency TEXT, p_price_negotiable BOOLEAN, p_city TEXT,
  p_seller_contact_phone_id UUID, p_city_id UUID DEFAULT NULL,
  p_district_id UUID DEFAULT NULL
)
RETURNS TABLE(listing_id UUID, vehicle_profile_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_user_id UUID := auth.uid(); v_created RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  PERFORM identity.require_active_seller_contact_phone(v_user_id, p_seller_contact_phone_id);

  SELECT * INTO v_created FROM public.create_own_private_listing_draft(
    p_make_id, p_model_id, p_variant_id, p_year, p_mileage_km, p_condition,
    p_fuel_type, p_transmission, p_body_type, p_drive_type, p_color,
    p_engine_volume_l, p_damage_state, p_owner_count, p_description,
    p_price_amount_text, p_currency, p_price_negotiable, p_city, p_city_id,
    p_district_id
  );

  UPDATE marketplace.listings AS listing
  SET seller_contact_phone_id = p_seller_contact_phone_id
  WHERE listing.id = v_created.listing_id
    AND listing.seller_id = v_user_id
    AND listing.status = 'draft'
    AND listing.moderation_status = 'draft';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing contact assignment failed' USING ERRCODE = 'OT409';
  END IF;

  RETURN QUERY SELECT v_created.listing_id, v_created.vehicle_profile_id, v_created.created_at;
END;
$$;

CREATE FUNCTION public.set_own_listing_seller_contact_phone(
  p_listing_id UUID,
  p_seller_contact_phone_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  PERFORM identity.require_active_seller_contact_phone(v_user_id, p_seller_contact_phone_id);

  UPDATE marketplace.listings AS listing
  SET seller_contact_phone_id = p_seller_contact_phone_id
  WHERE listing.id = p_listing_id
    AND listing.seller_id = v_user_id
    AND listing.archived_at IS NULL
    AND (
      (listing.status = 'draft' AND listing.moderation_status = 'draft')
      OR (listing.status IN ('draft', 'removed') AND listing.moderation_status = 'rejected')
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing contact cannot be changed' USING ERRCODE = 'OT409';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_own_listing_draft_v2(UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID, UUID) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.create_own_listing_draft_v2(UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID, UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.set_own_listing_seller_contact_phone(UUID, UUID) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.set_own_listing_seller_contact_phone(UUID, UUID) TO authenticated;

-- The existing creator remains untouched. Its seller-eligibility primitive now
-- recognizes either a legacy OTP verification or a current active contact,
-- allowing V2 to use a confirmed Auth account phone without another seller OTP.
CREATE OR REPLACE FUNCTION public.is_turkey_seller_phone_verified()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM identity.verified_seller_contact_phones AS contact
        WHERE contact.user_id = auth.uid()
          AND contact.is_active
          AND contact.revoked_at IS NULL
          AND contact.phone_e164 ~ '^[+]90[1-9][0-9]{9}$'
      )
      OR EXISTS (
        SELECT 1
        FROM identity.seller_phone_verifications AS verification
        WHERE verification.user_id = auth.uid()
          AND verification.phone_e164 ~ '^[+]90[1-9][0-9]{9}$'
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_turkey_seller_phone_verified() FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.is_turkey_seller_phone_verified() TO authenticated;

-- Preserve legacy fallback while the current frontend still has no contact
-- selector. Once B01B has fully cut over, fallback may be removed separately.
CREATE OR REPLACE FUNCTION public.get_listing_seller_contact(p_listing_id UUID)
RETURNS TABLE (phone TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF p_listing_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT COALESCE(selected_contact.phone_e164, legacy.phone_e164)
  FROM marketplace.listings AS listing
  INNER JOIN vehicle.vehicle_profiles AS vehicle_profile ON vehicle_profile.id = listing.vehicle_profile_id
  INNER JOIN vehicle.makes AS make ON make.id = vehicle_profile.make_id
  INNER JOIN vehicle.models AS model ON model.id = vehicle_profile.model_id
  INNER JOIN vehicle.makes AS parent_make ON parent_make.id = model.make_id
  LEFT JOIN identity.verified_seller_contact_phones AS selected_contact
    ON selected_contact.id = listing.seller_contact_phone_id
   AND selected_contact.user_id = listing.seller_id
   AND selected_contact.is_active
   AND selected_contact.revoked_at IS NULL
  LEFT JOIN identity.seller_phone_verifications AS legacy
    ON legacy.user_id = listing.seller_id
  WHERE listing.id = p_listing_id
    AND listing.seller_id <> v_user_id
    AND listing.status = 'active'
    AND listing.moderation_status = 'active'
    AND vehicle_profile.profile_status = 'active'
    AND make.is_active = TRUE
    AND model.is_active = TRUE
    AND parent_make.is_active = TRUE
    AND COALESCE(selected_contact.phone_e164, legacy.phone_e164) ~ '^[+]90[1-9][0-9]{9}$'
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_listing_seller_contact(UUID) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.get_listing_seller_contact(UUID) TO authenticated;

-- Keep the current OTP UI and legacy gate functional while additionally
-- recording reusable contacts for the later selector UI.
CREATE OR REPLACE FUNCTION identity.finalize_seller_phone_verification(
  p_user_id UUID,
  p_challenge_id UUID
)
RETURNS TABLE(phone_e164 TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, auth, pg_catalog AS $$
DECLARE v_phone_e164 TEXT;
BEGIN
  IF p_user_id IS NULL OR p_challenge_id IS NULL THEN
    RAISE EXCEPTION 'invalid seller phone challenge' USING ERRCODE = 'OT422';
  END IF;

  SELECT challenge.phone_e164 INTO v_phone_e164
  FROM identity.seller_phone_verification_challenges AS challenge
  WHERE challenge.id = p_challenge_id
    AND challenge.user_id = p_user_id
    AND challenge.purpose = 'turkey_seller_contact'
    AND challenge.status = 'sent'
    AND challenge.expires_at > NOW()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  PERFORM identity.upsert_verified_seller_contact_phone(
    p_user_id, v_phone_e164, 'seller_otp', FALSE
  );

  INSERT INTO identity.seller_phone_verifications (user_id, phone_e164, verified_at)
  VALUES (p_user_id, v_phone_e164, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET phone_e164 = EXCLUDED.phone_e164,
        verified_at = EXCLUDED.verified_at;

  UPDATE identity.seller_phone_verification_challenges
  SET status = 'consumed', consumed_at = NOW()
  WHERE id = p_challenge_id;

  RETURN QUERY SELECT v_phone_e164;
END;
$$;

REVOKE ALL ON FUNCTION identity.finalize_seller_phone_verification(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION identity.finalize_seller_phone_verification(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
