BEGIN;

-- JLC-0524: account identity stays international.  Kazakhstan seller
-- eligibility is instead bound to a reusable, verified +7 seller contact at
-- every protected listing-write boundary.  Existing contacts and historical
-- listings are deliberately left untouched.

ALTER TABLE identity.seller_phone_verification_challenges
  DROP CONSTRAINT seller_phone_challenge_phone_chk;
ALTER TABLE identity.seller_phone_verification_challenges
  ADD CONSTRAINT seller_phone_challenge_phone_chk
  CHECK (phone_e164 ~ '^[+][1-9][0-9]{1,14}$') NOT VALID;
ALTER TABLE identity.seller_phone_verification_challenges
  VALIDATE CONSTRAINT seller_phone_challenge_phone_chk;

ALTER TABLE identity.seller_phone_verification_challenges
  DROP CONSTRAINT seller_phone_challenge_purpose_chk;
ALTER TABLE identity.seller_phone_verification_challenges
  ADD CONSTRAINT seller_phone_challenge_purpose_chk
  CHECK (purpose IN ('turkey_seller_contact', 'kazakhstan_seller_contact')) NOT VALID;
ALTER TABLE identity.seller_phone_verification_challenges
  VALIDATE CONSTRAINT seller_phone_challenge_purpose_chk;

CREATE FUNCTION identity.reserve_seller_phone_verification_challenge(
  p_user_id UUID,
  p_phone_e164 TEXT,
  p_provider TEXT,
  p_purpose TEXT
)
RETURNS TABLE(challenge_id UUID, outcome TEXT, retry_after_seconds INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, auth, pg_catalog AS $$
DECLARE
  v_latest TIMESTAMPTZ;
  v_id UUID;
BEGIN
  IF p_user_id IS NULL
     OR p_phone_e164 IS NULL
     OR p_phone_e164 !~ '^[+][1-9][0-9]{1,14}$'
     OR p_provider IS NULL
     OR p_provider !~ '^[a-z_]{3,40}$'
     OR p_purpose NOT IN ('turkey_seller_contact', 'kazakhstan_seller_contact') THEN
    RAISE EXCEPTION 'invalid seller phone challenge' USING ERRCODE = 'OT422';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(80400, pg_catalog.hashtext(p_user_id::TEXT));
  PERFORM pg_catalog.pg_advisory_xact_lock(80401, pg_catalog.hashtext(p_phone_e164));

  IF EXISTS (
    SELECT 1
    FROM identity.verified_seller_contact_phones AS contact
    WHERE contact.user_id = p_user_id
      AND contact.phone_e164 = p_phone_e164
      AND contact.is_active
      AND contact.revoked_at IS NULL
  ) THEN
    RETURN QUERY SELECT NULL::UUID, 'already_verified'::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT max(challenge.created_at) INTO v_latest
  FROM identity.seller_phone_verification_challenges AS challenge
  WHERE (challenge.user_id = p_user_id OR challenge.phone_e164 = p_phone_e164)
    AND challenge.created_at > NOW() - interval '60 seconds';
  IF v_latest IS NOT NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'rate_limited'::TEXT,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_latest + interval '60 seconds' - NOW())))::INTEGER);
    RETURN;
  END IF;

  IF (SELECT count(*) FROM identity.seller_phone_verification_challenges WHERE user_id = p_user_id AND created_at > NOW() - interval '1 hour') >= 3
     OR (SELECT count(*) FROM identity.seller_phone_verification_challenges WHERE phone_e164 = p_phone_e164 AND created_at > NOW() - interval '1 hour') >= 5 THEN
    RETURN QUERY SELECT NULL::UUID, 'rate_limited'::TEXT, 60;
    RETURN;
  END IF;

  INSERT INTO identity.seller_phone_verification_challenges(user_id, phone_e164, purpose, provider, expires_at)
  VALUES (p_user_id, p_phone_e164, p_purpose, p_provider, NOW() + interval '10 minutes')
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, 'reserved'::TEXT, NULL::INTEGER;
END;
$$;

CREATE FUNCTION public.reserve_seller_phone_verification_challenge_service(
  p_user_id UUID,
  p_phone_e164 TEXT,
  p_provider TEXT,
  p_purpose TEXT
)
RETURNS TABLE(challenge_id UUID, outcome TEXT, retry_after_seconds INTEGER)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT * FROM identity.reserve_seller_phone_verification_challenge(
    p_user_id, p_phone_e164, p_provider, p_purpose
  );
$$;

CREATE FUNCTION identity.finalize_seller_phone_verification(
  p_user_id UUID,
  p_challenge_id UUID,
  p_purpose TEXT
)
RETURNS TABLE(phone_e164 TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, auth, pg_catalog AS $$
DECLARE
  v_phone_e164 TEXT;
BEGIN
  IF p_user_id IS NULL
     OR p_challenge_id IS NULL
     OR p_purpose NOT IN ('turkey_seller_contact', 'kazakhstan_seller_contact') THEN
    RAISE EXCEPTION 'invalid seller phone challenge' USING ERRCODE = 'OT422';
  END IF;

  SELECT challenge.phone_e164 INTO v_phone_e164
  FROM identity.seller_phone_verification_challenges AS challenge
  WHERE challenge.id = p_challenge_id
    AND challenge.user_id = p_user_id
    AND challenge.purpose = p_purpose
    AND challenge.status = 'sent'
    AND challenge.expires_at > NOW()
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  PERFORM identity.upsert_verified_seller_contact_phone(
    p_user_id, v_phone_e164, 'seller_otp', FALSE
  );

  UPDATE identity.seller_phone_verification_challenges
  SET status = 'consumed', consumed_at = NOW()
  WHERE id = p_challenge_id
    AND status = 'sent';

  RETURN QUERY SELECT v_phone_e164;
END;
$$;

CREATE FUNCTION public.finalize_seller_phone_verification_service(
  p_user_id UUID,
  p_challenge_id UUID,
  p_purpose TEXT
)
RETURNS TABLE(phone_e164 TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT * FROM identity.finalize_seller_phone_verification(
    p_user_id, p_challenge_id, p_purpose
  );
$$;

CREATE FUNCTION public.has_active_seller_contact_phone_service(
  p_user_id UUID,
  p_phone_e164 TEXT
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p_user_id IS NOT NULL
    AND p_phone_e164 ~ '^[+][1-9][0-9]{1,14}$'
    AND EXISTS (
      SELECT 1
      FROM identity.verified_seller_contact_phones AS contact
      WHERE contact.user_id = p_user_id
        AND contact.phone_e164 = p_phone_e164
        AND contact.is_active
        AND contact.revoked_at IS NULL
    );
$$;

CREATE FUNCTION identity.require_kazakhstan_seller_contact_phone(
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
      AND contact.phone_e164 ~ '^[+]7[0-9]{10}$'
  ) THEN
    RAISE EXCEPTION 'Kazakhstan seller phone verification required' USING ERRCODE = 'OT403';
  END IF;
END;
$$;

CREATE FUNCTION public.list_own_kazakhstan_seller_contact_phones()
RETURNS TABLE(
  contact_id UUID,
  masked_phone TEXT,
  is_active BOOLEAN,
  is_current_account_phone BOOLEAN,
  verification_source TEXT,
  verified_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  RETURN QUERY
  SELECT contact.id,
         '+7 *** *** ' || right(contact.phone_e164, 4),
         contact.is_active,
         contact.is_current_account_phone,
         contact.verification_source,
         contact.verified_at
  FROM identity.verified_seller_contact_phones AS contact
  WHERE contact.user_id = v_user_id
    AND contact.is_active
    AND contact.revoked_at IS NULL
    AND contact.phone_e164 ~ '^[+]7[0-9]{10}$'
  ORDER BY contact.is_current_account_phone DESC, contact.verified_at DESC, contact.id;
END;
$$;

CREATE FUNCTION public.is_kazakhstan_seller_phone_verified()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM identity.verified_seller_contact_phones AS contact
      WHERE contact.user_id = auth.uid()
        AND contact.is_active
        AND contact.revoked_at IS NULL
        AND contact.phone_e164 ~ '^[+]7[0-9]{10}$'
    );
$$;

-- The V2 boundary supplies and validates a selected contact.  Its internal
-- private-draft wrapper remains available to the definer only, not browsers.
REVOKE EXECUTE ON FUNCTION public.create_own_private_listing_draft(
  UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type,
  vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT,
  TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID
) FROM authenticated;

CREATE OR REPLACE FUNCTION public.create_own_listing_draft_v2(
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
DECLARE
  v_user_id UUID := auth.uid();
  v_created RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403'; END IF;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  PERFORM identity.require_kazakhstan_seller_contact_phone(v_user_id, p_seller_contact_phone_id);

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
  IF NOT FOUND THEN RAISE EXCEPTION 'listing contact assignment failed' USING ERRCODE = 'OT409'; END IF;

  RETURN QUERY SELECT v_created.listing_id, v_created.vehicle_profile_id, v_created.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_own_listing_seller_contact_phone(
  p_listing_id UUID,
  p_seller_contact_phone_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403'; END IF;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  PERFORM identity.require_kazakhstan_seller_contact_phone(v_user_id, p_seller_contact_phone_id);

  UPDATE marketplace.listings AS listing
  SET seller_contact_phone_id = p_seller_contact_phone_id
  WHERE listing.id = p_listing_id
    AND listing.seller_id = v_user_id
    AND listing.archived_at IS NULL
    AND ((listing.status = 'draft' AND listing.moderation_status = 'draft')
      OR (listing.status IN ('draft', 'removed') AND listing.moderation_status = 'rejected'));
  IF NOT FOUND THEN RAISE EXCEPTION 'listing contact cannot be changed' USING ERRCODE = 'OT409'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_own_listing_for_review(p_listing_id UUID)
RETURNS TABLE(listing_id UUID, status TEXT, moderation_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_user_id UUID := auth.uid(); v_listing marketplace.listings%ROWTYPE; v_image_count INTEGER; v_finalized_photo_count INTEGER; v_cover_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403'; END IF;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT * INTO v_listing FROM marketplace.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  IF v_listing.seller_id <> v_user_id OR NOT vehicle.is_current_profile_owner(v_listing.vehicle_profile_id, v_user_id) THEN RAISE EXCEPTION 'listing owner authorization required' USING ERRCODE = 'OT403'; END IF;
  IF v_listing.status <> 'draft' OR v_listing.moderation_status <> 'draft' OR v_listing.archived_at IS NOT NULL THEN RAISE EXCEPTION 'illegal listing lifecycle transition' USING ERRCODE = 'OT409'; END IF;
  PERFORM identity.require_kazakhstan_seller_contact_phone(v_user_id, v_listing.seller_contact_phone_id);
  SELECT count(*) INTO v_image_count FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id = v_listing.vehicle_profile_id AND pm.media_type = 'image';
  IF v_image_count > 15 THEN RAISE EXCEPTION 'listing photo limit exceeded' USING ERRCODE = 'OT422'; END IF;
  SELECT count(*) INTO v_finalized_photo_count FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id = v_listing.vehicle_profile_id AND pm.media_type = 'image' AND pm.processed_status = 'processed' AND pm.blur_status IN ('blurred', 'skipped') AND pm.storage_path IS NOT NULL AND pm.original_path IS NOT NULL AND pm.large_path IS NOT NULL AND pm.card_path IS NOT NULL AND pm.thumb_path IS NOT NULL;
  IF v_image_count <> v_finalized_photo_count THEN RAISE EXCEPTION 'all listing photos must be processed safely' USING ERRCODE = 'OT422'; END IF;
  IF v_finalized_photo_count = 0 THEN
    IF v_listing.cover_media_id IS NOT NULL THEN RAISE EXCEPTION 'listing cover must reference a finalized photo' USING ERRCODE = 'OT422'; END IF;
  ELSE
    SELECT count(*) INTO v_cover_count FROM vehicle.profile_media pm WHERE pm.id = v_listing.cover_media_id AND pm.vehicle_profile_id = v_listing.vehicle_profile_id AND pm.is_cover = TRUE AND pm.media_type = 'image' AND pm.processed_status = 'processed' AND pm.blur_status IN ('blurred', 'skipped') AND pm.storage_path IS NOT NULL AND pm.original_path IS NOT NULL AND pm.large_path IS NOT NULL AND pm.card_path IS NOT NULL AND pm.thumb_path IS NOT NULL;
    IF v_cover_count < 1 THEN RAISE EXCEPTION 'a finalized cover photo is required when photos are present' USING ERRCODE = 'OT422'; END IF;
  END IF;
  UPDATE marketplace.listings AS l SET moderation_status = 'pending_review', moderation_note = NULL, rejection_reason = NULL, moderated_by = NULL, moderated_at = NULL WHERE l.id = p_listing_id AND l.status = 'draft' AND l.moderation_status = 'draft' RETURNING l.id, l.status::TEXT, l.moderation_status INTO listing_id, status, moderation_status;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing lifecycle changed during submit' USING ERRCODE = 'OT409'; END IF;
  INSERT INTO public.admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES (v_user_id, 'listing.submit', 'listing', p_listing_id, jsonb_build_object('previous_status', 'draft', 'previous_moderation_status', 'draft', 'new_status', 'draft', 'new_moderation_status', 'pending_review'));
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.resubmit_own_listing_for_review(p_listing_id UUID)
RETURNS TABLE(listing_id UUID, status TEXT, moderation_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_user_id UUID := auth.uid(); v_listing RECORD; v_vehicle RECORD; v_ownership RECORD; v_new_status marketplace.listing_status; v_new_moderation_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403'; END IF;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT l.id, l.vehicle_profile_id, l.seller_id, l.seller_contact_phone_id, l.status, l.moderation_status, l.archived_at INTO v_listing FROM marketplace.listings AS l WHERE l.id = p_listing_id FOR UPDATE;
  IF NOT FOUND OR v_listing.seller_id <> v_user_id OR v_listing.status NOT IN ('draft', 'removed') OR v_listing.moderation_status <> 'rejected' OR v_listing.archived_at IS NOT NULL THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  PERFORM identity.require_kazakhstan_seller_contact_phone(v_user_id, v_listing.seller_contact_phone_id);
  SELECT vp.id INTO v_vehicle FROM vehicle.vehicle_profiles AS vp WHERE vp.id = v_listing.vehicle_profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  SELECT po.owner_id, po.is_current, po.ended_at INTO v_ownership FROM vehicle.profile_ownership AS po WHERE po.vehicle_profile_id = v_vehicle.id AND po.is_current = TRUE AND po.ended_at IS NULL FOR UPDATE;
  IF NOT FOUND OR v_ownership.owner_id <> v_user_id OR v_ownership.is_current IS NOT TRUE OR v_ownership.ended_at IS NOT NULL THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  UPDATE marketplace.listings AS l SET status = 'draft', moderation_status = 'pending_review', moderation_note = NULL, rejection_reason = NULL, moderated_by = NULL, moderated_at = NULL, archived_at = NULL WHERE l.id = v_listing.id AND l.status = v_listing.status AND l.moderation_status = v_listing.moderation_status AND l.archived_at IS NULL RETURNING l.status, l.moderation_status INTO v_new_status, v_new_moderation_status;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  INSERT INTO public.admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES (v_user_id, 'listing.resubmit', 'listing', p_listing_id, jsonb_build_object('previous_status', v_listing.status::TEXT, 'previous_moderation_status', v_listing.moderation_status, 'new_status', v_new_status::TEXT, 'new_moderation_status', v_new_moderation_status));
  RETURN QUERY SELECT p_listing_id, v_new_status::TEXT, v_new_moderation_status;
END;
$$;

REVOKE ALL ON FUNCTION identity.reserve_seller_phone_verification_challenge(UUID, TEXT, TEXT, TEXT), identity.finalize_seller_phone_verification(UUID, UUID, TEXT), identity.require_kazakhstan_seller_contact_phone(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION identity.reserve_seller_phone_verification_challenge(UUID, TEXT, TEXT, TEXT), identity.finalize_seller_phone_verification(UUID, UUID, TEXT), identity.require_kazakhstan_seller_contact_phone(UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.reserve_seller_phone_verification_challenge_service(UUID, TEXT, TEXT, TEXT), public.finalize_seller_phone_verification_service(UUID, UUID, TEXT), public.has_active_seller_contact_phone_service(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_seller_phone_verification_challenge_service(UUID, TEXT, TEXT, TEXT), public.finalize_seller_phone_verification_service(UUID, UUID, TEXT), public.has_active_seller_contact_phone_service(UUID, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.list_own_kazakhstan_seller_contact_phones(), public.is_kazakhstan_seller_phone_verified() FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.list_own_kazakhstan_seller_contact_phones(), public.is_kazakhstan_seller_phone_verified() TO authenticated;
REVOKE ALL ON FUNCTION public.create_own_listing_draft_v2(UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID, UUID), public.set_own_listing_seller_contact_phone(UUID, UUID), public.submit_own_listing_for_review(UUID), public.resubmit_own_listing_for_review(UUID) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.create_own_listing_draft_v2(UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID, UUID), public.set_own_listing_seller_contact_phone(UUID, UUID), public.submit_own_listing_for_review(UUID), public.resubmit_own_listing_for_review(UUID) TO authenticated;

COMMENT ON FUNCTION identity.require_kazakhstan_seller_contact_phone(UUID, UUID) IS
  'JLC-0524: a Jolmod Kazakhstan listing requires its owner''s active verified +7 seller contact. Account login phones remain country-neutral.';

NOTIFY pgrst, 'reload schema';
COMMIT;
