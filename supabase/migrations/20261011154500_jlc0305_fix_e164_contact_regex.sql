BEGIN;

-- Correct JLC-0305's PostgreSQL POSIX literal-plus expression. `[+]` avoids
-- backslash escaping ambiguity in both constraints and SQL function bodies.
ALTER TABLE identity.verified_seller_contact_phones
  DROP CONSTRAINT verified_seller_contact_phones_e164_chk;

ALTER TABLE identity.verified_seller_contact_phones
  ADD CONSTRAINT verified_seller_contact_phones_e164_chk
  CHECK (phone_e164 ~ '^[+][1-9][0-9]{1,14}$') NOT VALID;

ALTER TABLE identity.verified_seller_contact_phones
  VALIDATE CONSTRAINT verified_seller_contact_phones_e164_chk;

CREATE OR REPLACE FUNCTION identity.upsert_verified_seller_contact_phone(p_user_id UUID, p_phone_e164 TEXT, p_verification_source TEXT, p_is_current_account_phone BOOLEAN DEFAULT FALSE)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_contact_id UUID; v_contact_is_active BOOLEAN; v_other_owner UUID; v_active_count INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_phone_e164 IS NULL OR p_phone_e164 !~ '^[+][1-9][0-9]{1,14}$' OR p_verification_source NOT IN ('auth_account_phone', 'seller_otp') THEN RAISE EXCEPTION 'invalid verified seller contact' USING ERRCODE = 'OT422'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(80410, pg_catalog.hashtext(p_user_id::TEXT)); PERFORM pg_catalog.pg_advisory_xact_lock(80411, pg_catalog.hashtext(p_phone_e164));
  SELECT contact.user_id INTO v_other_owner FROM identity.verified_seller_contact_phones AS contact WHERE contact.phone_e164 = p_phone_e164 AND contact.is_active AND contact.user_id <> p_user_id FOR UPDATE;
  IF FOUND THEN RAISE EXCEPTION 'verified seller contact belongs to another user' USING ERRCODE = 'OT409'; END IF;
  SELECT contact.id, contact.is_active INTO v_contact_id, v_contact_is_active FROM identity.verified_seller_contact_phones AS contact WHERE contact.user_id = p_user_id AND contact.phone_e164 = p_phone_e164 ORDER BY contact.created_at DESC, contact.id DESC LIMIT 1 FOR UPDATE;
  IF p_is_current_account_phone THEN UPDATE identity.verified_seller_contact_phones AS contact SET is_current_account_phone = FALSE WHERE contact.user_id = p_user_id AND contact.is_active AND contact.is_current_account_phone AND contact.phone_e164 <> p_phone_e164; END IF;
  SELECT count(*)::INTEGER INTO v_active_count FROM identity.verified_seller_contact_phones AS contact WHERE contact.user_id = p_user_id AND contact.is_active AND (v_contact_id IS NULL OR contact.id <> v_contact_id);
  IF (v_contact_id IS NULL OR NOT COALESCE(v_contact_is_active, FALSE)) AND v_active_count >= 3 THEN RAISE EXCEPTION 'active seller contact limit reached' USING ERRCODE = 'OT429'; END IF;
  IF v_contact_id IS NULL THEN INSERT INTO identity.verified_seller_contact_phones (user_id, phone_e164, verified_at, verification_source, is_current_account_phone, is_active, revoked_at) VALUES (p_user_id, p_phone_e164, NOW(), p_verification_source, p_is_current_account_phone, TRUE, NULL) RETURNING id INTO v_contact_id;
  ELSE UPDATE identity.verified_seller_contact_phones AS contact SET verified_at = NOW(), verification_source = p_verification_source, is_current_account_phone = p_is_current_account_phone, is_active = TRUE, revoked_at = NULL WHERE contact.id = v_contact_id; END IF;
  RETURN v_contact_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_own_verified_account_phone()
RETURNS TABLE(outcome TEXT, contact_id UUID) LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_phone_e164 TEXT; v_phone_confirmed_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT user_record.phone, user_record.phone_confirmed_at INTO v_phone_e164, v_phone_confirmed_at FROM auth.users AS user_record WHERE user_record.id = v_user_id;
  IF v_phone_e164 IS NULL THEN RETURN QUERY SELECT 'phone_missing'::TEXT, NULL::UUID; RETURN; END IF;
  IF v_phone_confirmed_at IS NULL THEN RETURN QUERY SELECT 'phone_unconfirmed'::TEXT, NULL::UUID; RETURN; END IF;
  IF v_phone_e164 ~ '^[1-9][0-9]{1,14}$' THEN v_phone_e164 := '+' || v_phone_e164; END IF;
  IF v_phone_e164 !~ '^[+][1-9][0-9]{1,14}$' THEN RETURN QUERY SELECT 'phone_not_supported'::TEXT, NULL::UUID; RETURN; END IF;
  contact_id := identity.upsert_verified_seller_contact_phone(v_user_id, v_phone_e164, 'auth_account_phone', TRUE);
  RETURN QUERY SELECT 'synced'::TEXT, contact_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_turkey_seller_phone_verified()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND (EXISTS (SELECT 1 FROM identity.verified_seller_contact_phones AS contact WHERE contact.user_id = auth.uid() AND contact.is_active AND contact.revoked_at IS NULL AND contact.phone_e164 ~ '^[+][1-9][0-9]{1,14}$') OR EXISTS (SELECT 1 FROM identity.seller_phone_verifications AS verification WHERE verification.user_id = auth.uid() AND verification.phone_e164 ~ '^[+]90[1-9][0-9]{9}$'));
$$;

CREATE OR REPLACE FUNCTION public.get_listing_seller_contact(p_listing_id UUID)
RETURNS TABLE(phone TEXT) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF p_listing_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT selected_contact.phone_e164 FROM marketplace.listings AS listing INNER JOIN vehicle.vehicle_profiles AS vehicle_profile ON vehicle_profile.id = listing.vehicle_profile_id INNER JOIN vehicle.makes AS make ON make.id = vehicle_profile.make_id INNER JOIN vehicle.models AS model ON model.id = vehicle_profile.model_id INNER JOIN vehicle.makes AS parent_make ON parent_make.id = model.make_id INNER JOIN identity.verified_seller_contact_phones AS selected_contact ON selected_contact.id = listing.seller_contact_phone_id AND selected_contact.user_id = listing.seller_id AND selected_contact.is_active AND selected_contact.revoked_at IS NULL WHERE listing.id = p_listing_id AND listing.seller_id <> v_user_id AND listing.status = 'active' AND listing.moderation_status = 'active' AND vehicle_profile.profile_status = 'active' AND make.is_active AND model.is_active AND parent_make.is_active AND selected_contact.phone_e164 ~ '^[+][1-9][0-9]{1,14}$' LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_listing_seller_contact_disclosure(p_listing_id UUID)
RETURNS TABLE(allowed BOOLEAN) LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_buyer_id UUID := auth.uid(); v_now TIMESTAMPTZ := pg_catalog.now();
BEGIN
  IF v_buyer_id IS NULL OR p_listing_id IS NULL THEN RETURN QUERY SELECT FALSE; RETURN; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(80412, pg_catalog.hashtextextended(v_buyer_id::TEXT || ':' || p_listing_id::TEXT, 0));
  IF NOT EXISTS (SELECT 1 FROM marketplace.listings AS listing INNER JOIN vehicle.vehicle_profiles AS vehicle_profile ON vehicle_profile.id = listing.vehicle_profile_id INNER JOIN vehicle.makes AS make ON make.id = vehicle_profile.make_id INNER JOIN vehicle.models AS model ON model.id = vehicle_profile.model_id INNER JOIN vehicle.makes AS parent_make ON parent_make.id = model.make_id INNER JOIN identity.verified_seller_contact_phones AS contact ON contact.id = listing.seller_contact_phone_id AND contact.user_id = listing.seller_id AND contact.is_active AND contact.revoked_at IS NULL AND contact.phone_e164 ~ '^[+][1-9][0-9]{1,14}$' WHERE listing.id = p_listing_id AND listing.seller_id <> v_buyer_id AND listing.status = 'active' AND listing.moderation_status = 'active' AND vehicle_profile.profile_status = 'active' AND make.is_active AND model.is_active AND parent_make.is_active) THEN RETURN QUERY SELECT FALSE; RETURN; END IF;
  IF (SELECT count(*) FROM identity.listing_seller_contact_disclosures WHERE buyer_id = v_buyer_id AND created_at >= v_now - INTERVAL '1 hour') >= 20 OR (SELECT count(*) FROM identity.listing_seller_contact_disclosures WHERE buyer_id = v_buyer_id AND created_at >= v_now - INTERVAL '1 day') >= 100 THEN RETURN QUERY SELECT FALSE; RETURN; END IF;
  INSERT INTO identity.listing_seller_contact_disclosures (buyer_id, listing_id) VALUES (v_buyer_id, p_listing_id); RETURN QUERY SELECT TRUE;
END;
$$;

REVOKE ALL ON FUNCTION identity.upsert_verified_seller_contact_phone(UUID, TEXT, TEXT, BOOLEAN), identity.require_active_seller_contact_phone(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION identity.upsert_verified_seller_contact_phone(UUID, TEXT, TEXT, BOOLEAN), identity.require_active_seller_contact_phone(UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.sync_own_verified_account_phone(), public.list_own_verified_seller_contact_phones(), public.is_turkey_seller_phone_verified(), public.get_listing_seller_contact(UUID), public.reserve_listing_seller_contact_disclosure(UUID) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_own_verified_account_phone(), public.list_own_verified_seller_contact_phones(), public.is_turkey_seller_phone_verified(), public.get_listing_seller_contact(UUID), public.reserve_listing_seller_contact_disclosure(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
