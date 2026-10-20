-- JLC-0519 deterministic staff/seller/dealer boundary.
BEGIN;

-- public.submit_own_listing_for_review
CREATE OR REPLACE FUNCTION public.submit_own_listing_for_review(p_listing_id UUID)
RETURNS TABLE(listing_id UUID, status TEXT, moderation_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_user_id UUID := auth.uid(); v_listing marketplace.listings%ROWTYPE; v_image_count INTEGER; v_finalized_photo_count INTEGER; v_cover_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT * INTO v_listing FROM marketplace.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  IF v_listing.seller_id <> v_user_id OR NOT vehicle.is_current_profile_owner(v_listing.vehicle_profile_id, v_user_id) THEN RAISE EXCEPTION 'listing owner authorization required' USING ERRCODE = 'OT403'; END IF;
  IF v_listing.status <> 'draft' OR v_listing.moderation_status <> 'draft' OR v_listing.archived_at IS NOT NULL THEN RAISE EXCEPTION 'illegal listing lifecycle transition' USING ERRCODE = 'OT409'; END IF;
  SELECT count(*) INTO v_image_count FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = v_listing.vehicle_profile_id AND pm.media_type = 'image';
  IF v_image_count > 15 THEN
    RAISE EXCEPTION 'listing photo limit exceeded' USING ERRCODE = 'OT422';
  END IF;
  SELECT count(*) INTO v_finalized_photo_count FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = v_listing.vehicle_profile_id AND pm.media_type = 'image'
    AND pm.processed_status = 'processed' AND pm.blur_status IN ('blurred', 'skipped')
    AND pm.storage_path IS NOT NULL AND pm.original_path IS NOT NULL
    AND pm.large_path IS NOT NULL AND pm.card_path IS NOT NULL AND pm.thumb_path IS NOT NULL;
  IF v_image_count <> v_finalized_photo_count THEN
    RAISE EXCEPTION 'all listing photos must be processed safely' USING ERRCODE = 'OT422';
  END IF;
  IF v_finalized_photo_count = 0 THEN
    IF v_listing.cover_media_id IS NOT NULL THEN RAISE EXCEPTION 'listing cover must reference a finalized photo' USING ERRCODE = 'OT422'; END IF;
  ELSE
    SELECT count(*) INTO v_cover_count FROM vehicle.profile_media pm
    WHERE pm.id = v_listing.cover_media_id AND pm.vehicle_profile_id = v_listing.vehicle_profile_id
      AND pm.is_cover = TRUE AND pm.media_type = 'image' AND pm.processed_status = 'processed'
      AND pm.blur_status IN ('blurred', 'skipped') AND pm.storage_path IS NOT NULL
      AND pm.original_path IS NOT NULL AND pm.large_path IS NOT NULL
      AND pm.card_path IS NOT NULL AND pm.thumb_path IS NOT NULL;
    IF v_cover_count < 1 THEN RAISE EXCEPTION 'a finalized cover photo is required when photos are present' USING ERRCODE = 'OT422'; END IF;
  END IF;
  UPDATE marketplace.listings AS l SET moderation_status = 'pending_review', moderation_note = NULL, rejection_reason = NULL, moderated_by = NULL, moderated_at = NULL WHERE l.id = p_listing_id AND l.status = 'draft' AND l.moderation_status = 'draft' RETURNING l.id, l.status::TEXT, l.moderation_status INTO listing_id, status, moderation_status;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing lifecycle changed during submit' USING ERRCODE = 'OT409'; END IF;
  INSERT INTO public.admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES (v_user_id, 'listing.submit', 'listing', p_listing_id, jsonb_build_object('previous_status', 'draft', 'previous_moderation_status', 'draft', 'new_status', 'draft', 'new_moderation_status', 'pending_review'));
  RETURN NEXT;
END;
$$;

-- public.resubmit_own_listing_for_review
CREATE OR REPLACE FUNCTION public.resubmit_own_listing_for_review(p_listing_id UUID)
RETURNS TABLE (
  listing_id UUID,
  status TEXT,
  moderation_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing RECORD;
  v_vehicle RECORD;
  v_ownership RECORD;
  v_new_status marketplace.listing_status;
  v_new_moderation_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  -- Deterministic order: listing, vehicle profile, then its current ownership row.
  SELECT l.id, l.vehicle_profile_id, l.seller_id, l.status,
         l.moderation_status, l.archived_at
  INTO v_listing
  FROM marketplace.listings AS l
  WHERE l.id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND OR v_listing.seller_id <> v_user_id
     OR v_listing.status NOT IN ('draft', 'removed')
     OR v_listing.moderation_status <> 'rejected'
     OR v_listing.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  SELECT vp.id
  INTO v_vehicle
  FROM vehicle.vehicle_profiles AS vp
  WHERE vp.id = v_listing.vehicle_profile_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  SELECT po.owner_id, po.is_current, po.ended_at
  INTO v_ownership
  FROM vehicle.profile_ownership AS po
  WHERE po.vehicle_profile_id = v_vehicle.id
    AND po.is_current = TRUE
    AND po.ended_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR v_ownership.owner_id <> v_user_id
     OR v_ownership.is_current IS NOT TRUE
     OR v_ownership.ended_at IS NOT NULL THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  UPDATE marketplace.listings AS l
  SET status = 'draft',
      moderation_status = 'pending_review',
      moderation_note = NULL,
      rejection_reason = NULL,
      moderated_by = NULL,
      moderated_at = NULL,
      archived_at = NULL
  WHERE l.id = v_listing.id
    AND l.status = v_listing.status
    AND l.moderation_status = v_listing.moderation_status
    AND l.archived_at IS NULL
  RETURNING l.status, l.moderation_status
  INTO v_new_status, v_new_moderation_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id, action, entity_type, entity_id, metadata
  ) VALUES (
    v_user_id,
    'listing.resubmit',
    'listing',
    p_listing_id,
    jsonb_build_object(
      'previous_status', v_listing.status::TEXT,
      'previous_moderation_status', v_listing.moderation_status,
      'new_status', v_new_status::TEXT,
      'new_moderation_status', v_new_moderation_status
    )
  );

  RETURN QUERY SELECT p_listing_id, v_new_status::TEXT, v_new_moderation_status;
END;
$$;

-- public.pause_own_listing
CREATE OR REPLACE FUNCTION public.pause_own_listing(p_listing_id UUID)
RETURNS TABLE (
  listing_id UUID,
  status TEXT,
  moderation_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing RECORD;
  v_new_status marketplace.listing_status;
  v_new_moderation_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing_id is required' USING ERRCODE = 'OT422';
  END IF;

  SELECT
    l.id,
    l.vehicle_profile_id,
    l.seller_id,
    l.status,
    l.moderation_status
  INTO v_listing
  FROM marketplace.listings AS l
  WHERE l.id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  IF v_listing.seller_id <> v_user_id
     OR NOT vehicle.is_current_profile_owner(v_listing.vehicle_profile_id, v_user_id) THEN
    RAISE EXCEPTION 'listing owner authorization required' USING ERRCODE = 'OT403';
  END IF;

  IF NOT (
    v_listing.status = 'active'
    AND v_listing.moderation_status = 'active'
  ) THEN
    RAISE EXCEPTION 'illegal listing lifecycle transition' USING ERRCODE = 'OT409';
  END IF;

  UPDATE marketplace.listings AS l
  SET status = 'paused'
  WHERE l.id = p_listing_id
    AND l.status = v_listing.status
    AND l.moderation_status = v_listing.moderation_status
  RETURNING l.status, l.moderation_status
  INTO v_new_status, v_new_moderation_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing lifecycle changed during pause' USING ERRCODE = 'OT409';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_user_id,
    'listing.pause',
    'listing',
    p_listing_id,
    jsonb_build_object(
      'previous_status', v_listing.status::TEXT,
      'previous_moderation_status', v_listing.moderation_status,
      'new_status', v_new_status::TEXT,
      'new_moderation_status', v_new_moderation_status
    )
  );

  RETURN QUERY SELECT p_listing_id, v_new_status::TEXT, v_new_moderation_status;
END;
$$;

-- public.archive_own_listing
CREATE OR REPLACE FUNCTION public.archive_own_listing(p_listing_id UUID)
RETURNS TABLE (
  listing_id UUID,
  status TEXT,
  moderation_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing RECORD;
  v_new_status marketplace.listing_status;
  v_new_moderation_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing_id is required' USING ERRCODE = 'OT422';
  END IF;

  SELECT l.id, l.vehicle_profile_id, l.seller_id, l.status, l.moderation_status
  INTO v_listing
  FROM marketplace.listings AS l
  WHERE l.id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  IF v_listing.seller_id <> v_user_id
     OR NOT vehicle.is_current_profile_owner(v_listing.vehicle_profile_id, v_user_id) THEN
    RAISE EXCEPTION 'listing owner authorization required' USING ERRCODE = 'OT403';
  END IF;

  IF NOT (
    (v_listing.status IN ('draft', 'active', 'paused', 'removed')
      AND v_listing.moderation_status IN ('active', 'pending_review', 'rejected'))
    OR (v_listing.status = 'draft' AND v_listing.moderation_status = 'draft')
  ) THEN
    RAISE EXCEPTION 'illegal listing lifecycle transition' USING ERRCODE = 'OT409';
  END IF;

  UPDATE marketplace.listings AS l
  SET status = 'removed', moderation_status = 'archived', archived_at = now()
  WHERE l.id = p_listing_id
    AND l.status = v_listing.status
    AND l.moderation_status = v_listing.moderation_status
  RETURNING l.status, l.moderation_status
  INTO v_new_status, v_new_moderation_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing lifecycle changed during archive' USING ERRCODE = 'OT409';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id, action, entity_type, entity_id, metadata
  ) VALUES (
    v_user_id, 'listing.archive', 'listing', p_listing_id,
    jsonb_build_object(
      'previous_status', v_listing.status::TEXT,
      'previous_moderation_status', v_listing.moderation_status,
      'new_status', v_new_status::TEXT,
      'new_moderation_status', v_new_moderation_status
    )
  );

  RETURN QUERY SELECT p_listing_id, v_new_status::TEXT, v_new_moderation_status;
END;
$$;

-- public.save_own_rejected_listing
CREATE OR REPLACE FUNCTION public.save_own_rejected_listing(
  p_listing_id UUID,
  p_expected_listing_updated_at TIMESTAMPTZ,
  p_expected_vehicle_updated_at TIMESTAMPTZ,
  p_make_id UUID,
  p_model_id UUID,
  p_year SMALLINT,
  p_mileage_km INTEGER,
  p_condition TEXT,
  p_fuel_type vehicle.fuel_type,
  p_transmission vehicle.transmission_type,
  p_body_type TEXT,
  p_drive_type TEXT,
  p_color TEXT,
  p_engine_volume_l NUMERIC,
  p_damage_state TEXT,
  p_owner_count SMALLINT,
  p_description TEXT,
  p_price_amount_text TEXT,
  p_currency TEXT,
  p_price_negotiable BOOLEAN,
  p_city TEXT
)
RETURNS TABLE (
  saved_listing_id UUID,
  saved_listing_updated_at TIMESTAMPTZ,
  saved_vehicle_updated_at TIMESTAMPTZ,
  saved_status TEXT,
  saved_moderation_status TEXT,
  saved_title TEXT,
  saved_title_generated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing RECORD;
  v_vehicle RECORD;
  v_price_amount BIGINT;
  v_canonical_title TEXT;
  v_listing_updated_at TIMESTAMPTZ;
  v_vehicle_updated_at TIMESTAMPTZ;
  v_next_status marketplace.listing_status;
  v_next_moderation_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF p_listing_id IS NULL OR p_expected_listing_updated_at IS NULL OR p_expected_vehicle_updated_at IS NULL THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;
  IF p_price_amount_text IS NULL OR p_price_amount_text !~ '^[1-9][0-9]*$' OR length(p_price_amount_text) > 19
     OR (length(p_price_amount_text) = 19 AND p_price_amount_text > '9223372036854775807') THEN
    RAISE EXCEPTION 'invalid price amount' USING ERRCODE = 'OT422';
  END IF;
  BEGIN v_price_amount := p_price_amount_text::BIGINT; EXCEPTION WHEN numeric_value_out_of_range THEN
    RAISE EXCEPTION 'invalid price amount' USING ERRCODE = 'OT422';
  END;
  IF v_price_amount <= 0
     OR p_make_id IS NULL OR p_model_id IS NULL OR p_year IS NULL OR p_year < 1900 OR p_year > EXTRACT(YEAR FROM NOW())::INTEGER + 1
     OR p_mileage_km IS NULL OR p_mileage_km < 0 OR (p_condition IS NOT NULL AND p_condition NOT IN ('used', 'new'))
     OR p_fuel_type IS NULL OR p_transmission IS NULL
     OR (p_drive_type IS NOT NULL AND p_drive_type NOT IN ('front', 'rear', 'awd', '4x4'))
     OR (p_damage_state IS NOT NULL AND p_damage_state NOT IN ('unknown', 'none', 'minor', 'major', 'painted', 'replaced', 'heavy_damage'))
     OR (p_owner_count IS NOT NULL AND p_owner_count <= 0)
     OR (p_engine_volume_l IS NOT NULL AND (p_engine_volume_l <= 0 OR p_engine_volume_l > 999.9 OR p_engine_volume_l IS DISTINCT FROM trunc(p_engine_volume_l, 1)))
     OR p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$' OR p_price_negotiable IS NULL
     OR p_city IS NULL OR char_length(btrim(p_city)) = 0
     OR (p_fuel_type = 'electric' AND p_engine_volume_l IS NOT NULL)
     OR (p_fuel_type <> 'electric' AND p_engine_volume_l IS NULL) THEN
    RAISE EXCEPTION 'invalid editable fields' USING ERRCODE = 'OT422';
  END IF;

  SELECT l.id, l.vehicle_profile_id, l.seller_id, l.status, l.moderation_status, l.archived_at, l.updated_at, l.title, l.title_generated
  INTO v_listing FROM marketplace.listings AS l WHERE l.id = p_listing_id FOR UPDATE;
  IF NOT FOUND OR v_listing.seller_id <> v_user_id OR v_listing.archived_at IS NOT NULL
     OR NOT ((v_listing.status = 'removed' AND v_listing.moderation_status = 'rejected')
          OR (v_listing.status = 'active' AND v_listing.moderation_status = 'active')
          OR (v_listing.status = 'draft' AND v_listing.moderation_status = 'pending_review')) THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;
  IF v_listing.updated_at IS DISTINCT FROM p_expected_listing_updated_at THEN
    RAISE EXCEPTION 'listing changed during editing' USING ERRCODE = 'OT409';
  END IF;

  SELECT vp.id, vp.updated_at INTO v_vehicle FROM vehicle.vehicle_profiles AS vp
  WHERE vp.id = v_listing.vehicle_profile_id AND vp.created_by = v_user_id FOR UPDATE;
  IF NOT FOUND OR v_vehicle.updated_at IS DISTINCT FROM p_expected_vehicle_updated_at
     OR NOT vehicle.is_current_profile_owner(v_vehicle.id, v_user_id) THEN
    RAISE EXCEPTION 'listing changed during editing' USING ERRCODE = 'OT409';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vehicle.models AS m JOIN vehicle.makes AS mk ON mk.id = m.make_id
                 WHERE m.id = p_model_id AND m.make_id = p_make_id AND m.is_active AND mk.is_active) THEN
    RAISE EXCEPTION 'invalid make and model' USING ERRCODE = 'OT422';
  END IF;

  v_canonical_title := v_listing.title;
  IF v_listing.title_generated THEN
    SELECT concat_ws(' ', NULLIF(btrim(regexp_replace(mk.name, '[' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || ' ]+', ' ', 'g')), ''),
                     NULLIF(btrim(regexp_replace(m.name, '[' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || ' ]+', ' ', 'g')), ''), p_year::TEXT)
    INTO v_canonical_title FROM vehicle.makes AS mk JOIN vehicle.models AS m ON m.make_id = mk.id
    WHERE mk.id = p_make_id AND m.id = p_model_id;
  END IF;

  UPDATE vehicle.vehicle_profiles SET make_id = p_make_id, model_id = p_model_id, year = p_year, mileage_km = p_mileage_km,
    condition = p_condition, fuel_type = p_fuel_type, transmission = p_transmission, body_type = p_body_type, drive_type = p_drive_type,
    color = p_color, engine_volume_l = p_engine_volume_l, damage_state = p_damage_state, owner_count = p_owner_count
  WHERE id = v_vehicle.id RETURNING updated_at INTO v_vehicle_updated_at;

  IF v_listing.status = 'active' THEN
    v_next_status := 'draft'; v_next_moderation_status := 'pending_review';
  ELSE
    v_next_status := v_listing.status; v_next_moderation_status := v_listing.moderation_status;
  END IF;
  UPDATE marketplace.listings SET title = v_canonical_title, description = p_description, price_amount = v_price_amount,
    currency = p_currency, price_negotiable = p_price_negotiable, city = p_city,
    status = v_next_status, moderation_status = v_next_moderation_status,
    moderation_note = CASE WHEN v_listing.status = 'active' THEN NULL ELSE moderation_note END,
    rejection_reason = CASE WHEN v_listing.status = 'active' THEN NULL ELSE rejection_reason END,
    moderated_by = CASE WHEN v_listing.status = 'active' THEN NULL ELSE moderated_by END,
    moderated_at = CASE WHEN v_listing.status = 'active' THEN NULL ELSE moderated_at END
  WHERE id = p_listing_id RETURNING updated_at INTO v_listing_updated_at;

  IF v_listing.status = 'active' THEN
    INSERT INTO public.admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, 'listing.edit_resubmit', 'listing', p_listing_id,
      jsonb_build_object('previous_status', v_listing.status::TEXT, 'previous_moderation_status', v_listing.moderation_status,
                         'new_status', v_next_status::TEXT, 'new_moderation_status', v_next_moderation_status));
  END IF;
  RETURN QUERY SELECT p_listing_id, v_listing_updated_at, v_vehicle_updated_at, v_next_status::TEXT,
    v_next_moderation_status, v_canonical_title, v_listing.title_generated;
END;
$$;

-- public.initialize_own_vehicle_profile_ownership
CREATE OR REPLACE FUNCTION public.initialize_own_vehicle_profile_ownership(
  p_vehicle_profile_id UUID
)
RETURNS TABLE (
  ownership_id UUID,
  vehicle_profile_id UUID,
  owner_id UUID,
  is_current BOOLEAN,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_vehicle vehicle.vehicle_profiles%ROWTYPE;
  v_existing vehicle.profile_ownership%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  SELECT vp.*
  INTO v_vehicle
  FROM vehicle.vehicle_profiles AS vp
  WHERE vp.id = p_vehicle_profile_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_vehicle.created_by <> v_user_id
     OR v_vehicle.profile_status <> 'active' THEN
    RAISE EXCEPTION 'vehicle profile not found' USING ERRCODE = 'OT404';
  END IF;

  SELECT po.*
  INTO v_existing
  FROM vehicle.profile_ownership AS po
  WHERE po.vehicle_profile_id = v_vehicle.id
    AND po.is_current = TRUE
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'vehicle profile not found' USING ERRCODE = 'OT404';
  END IF;

  BEGIN
    RETURN QUERY
    INSERT INTO vehicle.profile_ownership AS inserted_ownership (
      vehicle_profile_id,
      owner_id,
      ownership_type,
      is_current,
      started_at,
      ended_at
    )
    VALUES (
      v_vehicle.id,
      v_user_id,
      'owner',
      TRUE,
      pg_catalog.now(),
      NULL
    )
    RETURNING
      inserted_ownership.id,
      inserted_ownership.vehicle_profile_id,
      inserted_ownership.owner_id,
      inserted_ownership.is_current,
      inserted_ownership.started_at,
      inserted_ownership.ended_at;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'vehicle profile not found' USING ERRCODE = 'OT404';
  END;
END;
$$;

-- vehicle.submit_own_vin
CREATE OR REPLACE FUNCTION vehicle.submit_own_vin(p_vehicle_profile_id UUID, p_vin TEXT)
RETURNS TABLE(result_code TEXT, masked_vin TEXT, checksum_state vehicle.vin_checksum_state)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = vehicle, extensions, pg_catalog AS $$
DECLARE v_normalized TEXT; v_fingerprint BYTEA; v_existing UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF auth.uid() IS NULL OR NOT vehicle.is_current_profile_owner(p_vehicle_profile_id, auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  v_normalized := upper(regexp_replace(trim(coalesce(p_vin, '')), '[\\s-]+', '', 'g'));
  IF v_normalized !~ '^[A-HJ-NPR-Z0-9]{17}$' THEN
    RETURN QUERY SELECT 'invalid_format'::TEXT, NULL::TEXT, 'unknown'::vehicle.vin_checksum_state; RETURN;
  END IF;
  v_fingerprint := extensions.digest(v_normalized, 'sha256');
  SELECT vehicle_profile_id INTO v_existing FROM vehicle.private_vins WHERE vin_fingerprint = v_fingerprint;
  IF v_existing IS NOT NULL AND v_existing <> p_vehicle_profile_id THEN
    RETURN QUERY SELECT 'review_required'::TEXT, NULL::TEXT, 'unknown'::vehicle.vin_checksum_state; RETURN;
  END IF;
  BEGIN
    INSERT INTO vehicle.private_vins (vehicle_profile_id, normalized_vin, vin_fingerprint, vin_last4, checksum_state)
    VALUES (p_vehicle_profile_id, v_normalized, v_fingerprint, right(v_normalized, 4), 'unknown')
    ON CONFLICT (vehicle_profile_id) DO UPDATE SET normalized_vin = EXCLUDED.normalized_vin, vin_fingerprint = EXCLUDED.vin_fingerprint, vin_last4 = EXCLUDED.vin_last4, checksum_state = EXCLUDED.checksum_state;
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT 'review_required'::TEXT, NULL::TEXT, 'unknown'::vehicle.vin_checksum_state; RETURN;
  END;
  RETURN QUERY SELECT 'bound'::TEXT, ('*************' || right(v_normalized, 4))::TEXT, 'unknown'::vehicle.vin_checksum_state;
END;
$$;

-- public.save_own_listing_vehicle_trust_contract
CREATE OR REPLACE FUNCTION public.save_own_listing_vehicle_trust_contract(
  p_listing_id UUID,
  p_power_kw SMALLINT,
  p_door_count SMALLINT,
  p_seat_count SMALLINT,
  p_battery_capacity_kwh NUMERIC,
  p_electric_range_km SMALLINT,
  p_hybrid_type vehicle.hybrid_type,
  p_trade_in_accepted BOOLEAN,
  p_seller_damage_declaration vehicle.seller_damage_declaration,
  p_seller_damage_notes TEXT,
  p_seller_service_declaration vehicle.seller_service_declaration,
  p_body_panels JSONB DEFAULT '[]'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing RECORD;
  v_panel JSONB;
  v_panel_name vehicle.body_panel;
  v_panel_condition vehicle.body_panel_condition;
  v_note TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF p_trade_in_accepted IS NULL
     OR p_seller_damage_declaration IS NULL
     OR p_seller_service_declaration IS NULL
     OR jsonb_typeof(p_body_panels) <> 'array' THEN
    RAISE EXCEPTION 'invalid vehicle trust contract' USING ERRCODE = 'OT422';
  END IF;
  IF p_seller_damage_notes IS NOT NULL
     AND (char_length(btrim(p_seller_damage_notes)) = 0 OR char_length(p_seller_damage_notes) > 4000) THEN
    RAISE EXCEPTION 'invalid vehicle trust contract' USING ERRCODE = 'OT422';
  END IF;

  SELECT l.id, l.vehicle_profile_id
  INTO v_listing
  FROM marketplace.listings AS l
  WHERE l.id = p_listing_id AND l.seller_id = v_user_id
    AND l.status IN ('draft', 'removed')
    AND l.moderation_status IN ('pending_review', 'rejected')
    AND l.archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR NOT vehicle.is_current_profile_owner(v_listing.vehicle_profile_id) THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  PERFORM 1 FROM vehicle.vehicle_profiles AS vp
  WHERE vp.id = v_listing.vehicle_profile_id AND vp.created_by = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  UPDATE vehicle.vehicle_profiles
  SET power_kw = p_power_kw,
      door_count = p_door_count,
      seat_count = p_seat_count,
      battery_capacity_kwh = p_battery_capacity_kwh,
      electric_range_km = p_electric_range_km,
      hybrid_type = p_hybrid_type,
      seller_damage_declaration = p_seller_damage_declaration,
      seller_damage_notes = NULLIF(btrim(p_seller_damage_notes), ''),
      seller_service_declaration = p_seller_service_declaration
  WHERE id = v_listing.vehicle_profile_id;

  UPDATE marketplace.listings
  SET trade_in_accepted = p_trade_in_accepted
  WHERE id = v_listing.id;

  -- The input is additive/updating rather than destructive: a client that
  -- cannot load a historic panel declaration must never erase it on save.
  INSERT INTO vehicle.profile_fact_evidence (vehicle_profile_id, field_key, provenance, evidence_kind)
  VALUES
    (v_listing.vehicle_profile_id, 'damage_declaration', 'seller', 'seller_statement'),
    (v_listing.vehicle_profile_id, 'service_declaration', 'seller', 'seller_statement');

  FOR v_panel IN SELECT value FROM jsonb_array_elements(p_body_panels) LOOP
    BEGIN
      v_panel_name := (v_panel ->> 'panel')::vehicle.body_panel;
      v_panel_condition := (v_panel ->> 'condition')::vehicle.body_panel_condition;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid vehicle trust contract' USING ERRCODE = 'OT422';
    END;
    v_note := NULLIF(btrim(v_panel ->> 'seller_evidence_note'), '');
    IF v_note IS NOT NULL AND char_length(v_note) > 2000 THEN
      RAISE EXCEPTION 'invalid vehicle trust contract' USING ERRCODE = 'OT422';
    END IF;
    INSERT INTO vehicle.body_panel_declarations (vehicle_profile_id, panel, condition, provenance, seller_evidence_note)
    VALUES (v_listing.vehicle_profile_id, v_panel_name, v_panel_condition, 'seller', v_note)
    ON CONFLICT (vehicle_profile_id, panel) DO UPDATE
    SET condition = EXCLUDED.condition,
        provenance = 'seller',
        seller_evidence_note = EXCLUDED.seller_evidence_note;
    INSERT INTO vehicle.profile_fact_evidence (vehicle_profile_id, field_key, provenance, evidence_kind)
    VALUES (v_listing.vehicle_profile_id, 'body_panel', 'seller', 'seller_statement');
  END LOOP;
END;
$$;

-- public.apply_own_verified_galeri_excel_import
CREATE OR REPLACE FUNCTION public.apply_own_verified_galeri_excel_import(p_source_sha256 TEXT, p_rows JSONB)
RETURNS TABLE (row_number INTEGER, status marketplace.dealer_import_row_status, external_listing_id TEXT, error_code TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketplace, vehicle, pg_catalog AS $$
DECLARE
  v_dealer_id UUID := auth.uid(); v_batch_id UUID; v_row JSONB; v_n INTEGER := 0;
  v_operation marketplace.dealer_import_operation; v_external TEXT; v_error TEXT; v_row_id UUID;
  v_make_slug TEXT; v_model_slug TEXT; v_title TEXT; v_description TEXT; v_city TEXT;
  v_year SMALLINT; v_mileage INTEGER; v_price BIGINT; v_fuel vehicle.fuel_type; v_transmission vehicle.transmission_type;
  v_make_id UUID; v_model_id UUID; v_listing_id UUID; v_vehicle_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_dealer_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='OT401'; END IF;
  IF NOT public.is_verified_galeri(v_dealer_id) THEN RAISE EXCEPTION 'verified Galeri required' USING ERRCODE='OT403'; END IF;
  IF p_source_sha256 !~ '^[0-9a-f]{64}$' OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'invalid import request' USING ERRCODE='OT422'; END IF;
  INSERT INTO marketplace.dealer_import_batches(dealer_id,source_sha256,status) VALUES(v_dealer_id,p_source_sha256,'applying') RETURNING id INTO v_batch_id;
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    v_n := v_n + 1; v_external := NULLIF(btrim(v_row->>'external_listing_id'),''); v_error := NULL; v_listing_id := NULL;
    BEGIN v_operation := COALESCE(NULLIF(btrim(v_row->>'operation'),''),'upsert')::marketplace.dealer_import_operation; EXCEPTION WHEN invalid_text_representation THEN v_error := 'invalid_operation'; END;
    IF jsonb_typeof(v_row) <> 'object' OR v_external IS NULL OR char_length(v_external) > 128 THEN v_error := 'invalid_external_listing_id'; END IF;
    IF v_error IS NULL AND v_operation = 'archive' THEN
      SELECT dlei.listing_id INTO v_listing_id FROM marketplace.dealer_listing_external_ids AS dlei WHERE dlei.dealer_id=v_dealer_id AND dlei.source='excel' AND dlei.external_listing_id=v_external FOR UPDATE;
      IF NOT FOUND THEN v_error := 'listing_not_found'; END IF;
    ELSIF v_error IS NULL THEN
      v_make_slug:=NULLIF(btrim(v_row->>'make_slug'),''); v_model_slug:=NULLIF(btrim(v_row->>'model_slug'),''); v_title:=NULLIF(btrim(v_row->>'title'),''); v_city:=NULLIF(btrim(v_row->>'city'),''); v_description:=NULLIF(btrim(v_row->>'description'),'');
      BEGIN v_year:=(v_row->>'year')::smallint; v_mileage:=(v_row->>'mileage_km')::integer; v_price:=(v_row->>'price_amount')::bigint; v_fuel:=(v_row->>'fuel_type')::vehicle.fuel_type; v_transmission:=(v_row->>'transmission')::vehicle.transmission_type; EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN v_error:='invalid_vehicle_value'; END;
      IF v_error IS NULL AND (v_make_slug IS NULL OR v_model_slug IS NULL OR v_title IS NULL OR v_city IS NULL OR char_length(v_title)>160 OR char_length(v_city)>120 OR (v_description IS NOT NULL AND char_length(v_description)>8000) OR v_year NOT BETWEEN 1900 AND EXTRACT(YEAR FROM NOW())::integer+1 OR v_mileage<0 OR v_price<=0) THEN v_error:='missing_or_invalid_required_field'; END IF;
      IF v_error IS NULL THEN SELECT ma.id,mo.id INTO v_make_id,v_model_id FROM vehicle.makes ma JOIN vehicle.models mo ON mo.make_id=ma.id WHERE ma.slug=v_make_slug AND mo.slug=v_model_slug AND ma.is_active AND mo.is_active; IF NOT FOUND THEN v_error:='unknown_vehicle_catalog'; END IF; END IF;
    END IF;
    INSERT INTO marketplace.dealer_import_rows(batch_id,row_number,operation,external_listing_id,status) VALUES(v_batch_id,v_n,COALESCE(v_operation,'upsert'),v_external,(CASE WHEN v_error IS NULL THEN 'valid' ELSE 'invalid' END)::marketplace.dealer_import_row_status) RETURNING id INTO v_row_id;
    IF v_error IS NOT NULL THEN INSERT INTO marketplace.dealer_import_issues(import_row_id,error_code) VALUES(v_row_id,v_error); row_number:=v_n;status:='invalid';external_listing_id:=v_external;error_code:=v_error;RETURN NEXT;CONTINUE; END IF;
    IF v_operation='archive' THEN UPDATE marketplace.listings SET status='archived',archived_at=now() WHERE id=v_listing_id AND seller_id=v_dealer_id; UPDATE marketplace.dealer_listing_external_ids SET last_seen_batch_id=v_batch_id WHERE dealer_id=v_dealer_id AND source='excel' AND external_listing_id=v_external; UPDATE marketplace.dealer_import_rows SET status='archived',listing_id=v_listing_id WHERE id=v_row_id; row_number:=v_n;status:='archived';external_listing_id:=v_external;error_code:=NULL;RETURN NEXT;CONTINUE; END IF;
    SELECT dlei.listing_id INTO v_listing_id FROM marketplace.dealer_listing_external_ids AS dlei WHERE dlei.dealer_id=v_dealer_id AND dlei.source='excel' AND dlei.external_listing_id=v_external FOR UPDATE;
    IF FOUND THEN
      UPDATE vehicle.vehicle_profiles SET make_id=v_make_id,model_id=v_model_id,year=v_year,mileage_km=v_mileage,fuel_type=v_fuel,transmission=v_transmission WHERE id=(SELECT l.vehicle_profile_id FROM marketplace.listings AS l WHERE l.id=v_listing_id AND l.seller_id=v_dealer_id);
      UPDATE marketplace.listings SET title=v_title,description=v_description,price_amount=v_price,city=v_city,status='draft',moderation_status='pending_review',published_at=NULL,moderated_by=NULL,moderated_at=NULL,archived_at=NULL,rejection_reason=NULL,moderation_note=NULL WHERE id=v_listing_id AND seller_id=v_dealer_id;
      UPDATE marketplace.dealer_listing_external_ids SET last_seen_batch_id=v_batch_id WHERE dealer_id=v_dealer_id AND source='excel' AND external_listing_id=v_external;
    ELSE
      INSERT INTO vehicle.vehicle_profiles(make_id,model_id,year,mileage_km,fuel_type,transmission,created_by) VALUES(v_make_id,v_model_id,v_year,v_mileage,v_fuel,v_transmission,v_dealer_id) RETURNING id INTO v_vehicle_id;
      INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id) VALUES(v_vehicle_id,v_dealer_id);
      INSERT INTO marketplace.listings(vehicle_profile_id,seller_id,seller_type,status,moderation_status,title,description,price_amount,city) VALUES(v_vehicle_id,v_dealer_id,'dealer','draft','pending_review',v_title,v_description,v_price,v_city) RETURNING id INTO v_listing_id;
      INSERT INTO marketplace.dealer_listing_external_ids(dealer_id,external_listing_id,listing_id,last_seen_batch_id) VALUES(v_dealer_id,v_external,v_listing_id,v_batch_id);
    END IF;
    UPDATE marketplace.dealer_import_rows SET status='applied',listing_id=v_listing_id WHERE id=v_row_id; row_number:=v_n;status:='applied';external_listing_id:=v_external;error_code:=NULL;RETURN NEXT;
  END LOOP;
  UPDATE marketplace.dealer_import_batches SET status='completed',completed_at=now() WHERE id=v_batch_id;
END; $$;

-- public.set_own_listing_cover_media
CREATE OR REPLACE FUNCTION public.set_own_listing_cover_media(
  p_listing_id UUID,
  p_cover_media_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_vehicle_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  SELECT vehicle_profile_id
    INTO v_vehicle_id
    FROM marketplace.listings
   WHERE id = p_listing_id
     AND seller_id = v_user_id
     AND status = 'draft'
     AND moderation_status IN ('draft', 'pending_review')
     AND archived_at IS NULL
   FOR UPDATE;

  IF NOT FOUND OR NOT vehicle.is_current_profile_owner(v_vehicle_id, v_user_id) THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  IF p_cover_media_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM vehicle.profile_media
     WHERE id = p_cover_media_id
       AND vehicle_profile_id = v_vehicle_id
       AND is_cover = TRUE
  ) THEN
    RAISE EXCEPTION 'invalid cover media' USING ERRCODE = 'OT422';
  END IF;

  UPDATE marketplace.listings
     SET cover_media_id = p_cover_media_id
   WHERE id = p_listing_id;
END;
$$;

-- public.attach_own_listing_video
CREATE OR REPLACE FUNCTION public.attach_own_listing_video(
  p_listing_id UUID,
  p_storage_path TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_video_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF p_title IS NULL OR char_length(btrim(p_title)) NOT BETWEEN 1 AND 120
     OR (p_description IS NOT NULL AND char_length(p_description) > 500)
     OR p_duration_seconds IS NULL OR p_duration_seconds NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'invalid video metadata' USING ERRCODE = 'OT422';
  END IF;
  IF NOT marketplace.can_manage_own_listing_video_storage_path(p_storage_path) THEN
    RAISE EXCEPTION 'verified Galeri listing video authority required' USING ERRCODE = 'OT403';
  END IF;

  PERFORM 1 FROM marketplace.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  IF split_part(p_storage_path, '/', 3) <> p_listing_id::TEXT THEN
    RAISE EXCEPTION 'storage path does not belong to listing' USING ERRCODE = 'OT422';
  END IF;
  IF EXISTS (SELECT 1 FROM marketplace.listing_videos WHERE listing_id = p_listing_id AND is_current) THEN
    RAISE EXCEPTION 'listing already has a current video' USING ERRCODE = 'OT409';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects AS object
    WHERE object.bucket_id = 'listing-videos'
      AND object.name = p_storage_path
      AND object.owner_id = v_actor_id::TEXT
  ) THEN
    RAISE EXCEPTION 'uploaded video object not found' USING ERRCODE = 'OT422';
  END IF;

  INSERT INTO marketplace.listing_videos (
    listing_id, seller_user_id, title, description, video_url, original_video_url,
    storage_path, duration_seconds, status, visibility, processing_status,
    blur_status, moderation_status, is_current
  ) VALUES (
    p_listing_id, v_actor_id, btrim(p_title), NULLIF(btrim(p_description), ''),
    p_storage_path, p_storage_path, p_storage_path, p_duration_seconds,
    'pending_review', 'private', 'pending', 'not_started', 'pending_review', TRUE
  ) RETURNING id INTO v_video_id;

  RETURN v_video_id;
END;
$$;

-- public.replace_own_listing_video
CREATE OR REPLACE FUNCTION public.replace_own_listing_video(
  p_listing_id UUID,
  p_storage_path TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL
)
RETURNS TABLE (video_id UUID, previous_storage_path TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_video_id UUID;
  v_previous_storage_path TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF p_title IS NULL OR char_length(btrim(p_title)) NOT BETWEEN 1 AND 120
     OR (p_description IS NOT NULL AND char_length(p_description) > 500)
     OR p_duration_seconds IS NULL OR p_duration_seconds NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'invalid video metadata' USING ERRCODE = 'OT422';
  END IF;
  IF NOT marketplace.can_manage_own_listing_video_storage_path(p_storage_path)
     OR split_part(p_storage_path, '/', 3) <> p_listing_id::TEXT THEN
    RAISE EXCEPTION 'verified Galeri listing video authority required' USING ERRCODE = 'OT403';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects AS object
    WHERE object.bucket_id = 'listing-videos' AND object.name = p_storage_path AND object.owner_id = v_actor_id::TEXT
  ) THEN RAISE EXCEPTION 'uploaded video object not found' USING ERRCODE = 'OT422'; END IF;

  SELECT video.id, video.storage_path INTO v_video_id, v_previous_storage_path
  FROM marketplace.listing_videos AS video
  WHERE video.listing_id = p_listing_id
    AND video.seller_user_id = v_actor_id
    AND video.is_current
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'current listing video not found' USING ERRCODE = 'OT404'; END IF;

  UPDATE marketplace.listing_videos AS video
  SET title = btrim(p_title), description = NULLIF(btrim(p_description), ''),
      video_url = p_storage_path, original_video_url = p_storage_path, processed_video_url = NULL,
      storage_path = p_storage_path, duration_seconds = p_duration_seconds,
      status = 'pending_review', visibility = 'private', processing_status = 'pending',
      blur_status = 'not_started', moderation_status = 'pending_review', processing_error = NULL,
      processed_at = NULL, moderation_note = NULL, rejection_reason = NULL,
      moderated_by = NULL, moderated_at = NULL
  WHERE video.id = v_video_id;

  RETURN QUERY SELECT v_video_id, v_previous_storage_path;
END;
$$;

-- public.remove_own_listing_video
CREATE OR REPLACE FUNCTION public.remove_own_listing_video(p_listing_id UUID)
RETURNS TABLE (video_id UUID, storage_path TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_path TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT video.storage_path INTO v_path FROM marketplace.listing_videos AS video
  WHERE video.listing_id = p_listing_id AND video.seller_user_id = v_actor_id AND video.is_current FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'current listing video not found' USING ERRCODE = 'OT404'; END IF;
  IF NOT marketplace.can_manage_own_listing_video_storage_path(v_path) THEN
    RAISE EXCEPTION 'verified Galeri listing video authority required' USING ERRCODE = 'OT403';
  END IF;
  RETURN QUERY
  UPDATE marketplace.listing_videos AS video
  SET is_current = FALSE, status = 'archived', visibility = 'private', moderation_status = 'archived'
  WHERE video.listing_id = p_listing_id AND video.seller_user_id = v_actor_id AND video.is_current
  RETURNING video.id, video.storage_path;
END;
$$;

-- public.issue_own_listing_video_upload_intent
CREATE OR REPLACE FUNCTION public.issue_own_listing_video_upload_intent(
  p_listing_id UUID,
  p_operation TEXT,
  p_mime_type TEXT,
  p_declared_size_bytes BIGINT
)
RETURNS TABLE (intent_id UUID, object_path TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_intent_id UUID := gen_random_uuid();
  v_extension TEXT;
  v_object_path TEXT;
  v_has_current_video BOOLEAN;
  v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '15 minutes';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF p_operation NOT IN ('create', 'replace')
     OR p_mime_type NOT IN ('video/mp4', 'video/webm', 'video/quicktime')
     OR p_declared_size_bytes IS NULL OR p_declared_size_bytes <= 0 OR p_declared_size_bytes > 104857600 THEN
    RAISE EXCEPTION 'invalid video upload intent' USING ERRCODE = 'OT422';
  END IF;

  v_extension := CASE p_mime_type WHEN 'video/mp4' THEN 'mp4' WHEN 'video/webm' THEN 'webm' ELSE 'mov' END;
  v_object_path := v_actor_id::TEXT || '/prod04a-2026082801/' || p_listing_id::TEXT || '/' || v_intent_id::TEXT || '.' || v_extension;

  IF NOT marketplace.can_manage_own_listing_video_storage_path(v_object_path) THEN
    RAISE EXCEPTION 'verified Galeri listing video authority required' USING ERRCODE = 'OT403';
  END IF;

  PERFORM 1 FROM marketplace.listings WHERE id = p_listing_id AND seller_id = v_actor_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM marketplace.listing_videos WHERE listing_id = p_listing_id AND is_current
  ) INTO v_has_current_video;
  IF (p_operation = 'create' AND v_has_current_video) OR (p_operation = 'replace' AND NOT v_has_current_video) THEN
    RAISE EXCEPTION 'video slot operation is not available' USING ERRCODE = 'OT409';
  END IF;

  INSERT INTO marketplace.listing_video_upload_intents (
    id, listing_id, owner_user_id, object_path, operation, mime_type, declared_size_bytes, expires_at
  ) VALUES (
    v_intent_id, p_listing_id, v_actor_id, v_object_path, p_operation, p_mime_type, p_declared_size_bytes, v_expires_at
  );
  RETURN QUERY SELECT v_intent_id, v_object_path, v_expires_at;
END;
$$;

-- public.finalize_own_listing_video_upload_intent
CREATE OR REPLACE FUNCTION public.finalize_own_listing_video_upload_intent(
  p_listing_id UUID,
  p_intent_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_intent marketplace.listing_video_upload_intents%ROWTYPE;
  v_video_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT * INTO v_intent FROM marketplace.listing_video_upload_intents
  WHERE id = p_intent_id AND listing_id = p_listing_id AND owner_user_id = v_actor_id FOR UPDATE;
  IF NOT FOUND OR v_intent.operation <> 'create' OR v_intent.expires_at <= NOW() OR v_intent.consumed_at IS NOT NULL OR v_intent.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'video upload intent is unavailable' USING ERRCODE = 'OT422';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'listing-videos' AND name = v_intent.object_path AND owner_id = v_actor_id::TEXT) THEN
    RAISE EXCEPTION 'uploaded video object not found' USING ERRCODE = 'OT422';
  END IF;
  SELECT public.attach_own_listing_video(p_listing_id, v_intent.object_path, p_title, p_description, p_duration_seconds) INTO v_video_id;
  UPDATE marketplace.listing_video_upload_intents SET consumed_at = NOW() WHERE id = v_intent.id AND consumed_at IS NULL;
  RETURN v_video_id;
END;
$$;

-- public.replace_own_listing_video_upload_intent
CREATE OR REPLACE FUNCTION public.replace_own_listing_video_upload_intent(
  p_listing_id UUID,
  p_intent_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL
)
RETURNS TABLE (video_id UUID, previous_storage_path TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_intent marketplace.listing_video_upload_intents%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT * INTO v_intent FROM marketplace.listing_video_upload_intents
  WHERE id = p_intent_id AND listing_id = p_listing_id AND owner_user_id = v_actor_id FOR UPDATE;
  IF NOT FOUND OR v_intent.operation <> 'replace' OR v_intent.expires_at <= NOW() OR v_intent.consumed_at IS NOT NULL OR v_intent.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'video upload intent is unavailable' USING ERRCODE = 'OT422';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'listing-videos' AND name = v_intent.object_path AND owner_id = v_actor_id::TEXT) THEN
    RAISE EXCEPTION 'uploaded video object not found' USING ERRCODE = 'OT422';
  END IF;
  RETURN QUERY SELECT * FROM public.replace_own_listing_video(p_listing_id, v_intent.object_path, p_title, p_description, p_duration_seconds);
  UPDATE marketplace.listing_video_upload_intents SET consumed_at = NOW() WHERE id = v_intent.id AND consumed_at IS NULL;
END;
$$;

-- public.revoke_own_listing_video_upload_intent
CREATE OR REPLACE FUNCTION public.revoke_own_listing_video_upload_intent(
  p_listing_id UUID,
  p_intent_id UUID
)
RETURNS TABLE (object_path TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_intent marketplace.listing_video_upload_intents%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  PERFORM 1
  FROM marketplace.listings AS listing
  WHERE listing.id = p_listing_id AND listing.seller_id = v_actor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  SELECT * INTO v_intent
  FROM marketplace.listing_video_upload_intents AS intent
  WHERE intent.id = p_intent_id
    AND intent.listing_id = p_listing_id
    AND intent.owner_user_id = v_actor_id
    AND intent.consumed_at IS NULL
    AND intent.revoked_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'video upload intent is unavailable' USING ERRCODE = 'OT422';
  END IF;

  UPDATE marketplace.listing_video_upload_intents
  SET revoked_at = NOW()
  WHERE id = v_intent.id AND revoked_at IS NULL AND consumed_at IS NULL;

  RETURN QUERY SELECT v_intent.object_path;
END;
$$;

-- public.create_own_listing_draft
CREATE OR REPLACE FUNCTION public.create_own_listing_draft(p_make_id uuid, p_model_id uuid, p_variant_id uuid, p_year smallint, p_mileage_km integer, p_condition text, p_fuel_type vehicle.fuel_type, p_transmission vehicle.transmission_type, p_body_type text, p_drive_type text, p_color text, p_engine_volume_l numeric, p_damage_state text, p_owner_count smallint, p_description text, p_price_amount_text text, p_currency text, p_price_negotiable boolean, p_city text, p_city_id uuid DEFAULT NULL::uuid, p_district_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(listing_id uuid, vehicle_profile_id uuid, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_price_amount BIGINT;
  v_seller_type TEXT;
  v_vehicle_profile_id UUID;
  v_listing_id UUID;
  v_created_at TIMESTAMPTZ;
  v_title TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  IF NOT public.is_turkey_seller_phone_verified() THEN
    RAISE EXCEPTION 'seller phone verification required' USING ERRCODE = 'OT403';
  END IF;

  IF p_price_amount_text IS NULL OR p_price_amount_text !~ '^[1-9][0-9]*$'
     OR length(p_price_amount_text) > 19
     OR (length(p_price_amount_text) = 19 AND p_price_amount_text > '9223372036854775807') THEN
    RAISE EXCEPTION 'invalid price amount' USING ERRCODE = 'OT422';
  END IF;
  BEGIN
    v_price_amount := p_price_amount_text::BIGINT;
  EXCEPTION WHEN numeric_value_out_of_range THEN
    RAISE EXCEPTION 'invalid price amount' USING ERRCODE = 'OT422';
  END;

  IF p_make_id IS NULL OR p_model_id IS NULL OR p_year IS NULL
     OR p_year < 1900 OR p_year > EXTRACT(YEAR FROM now())::INTEGER + 1
     OR p_mileage_km IS NULL OR p_mileage_km < 0
     OR p_condition IS NULL OR p_condition NOT IN ('used', 'new')
     OR p_fuel_type IS NULL OR p_transmission IS NULL
     OR (p_body_type IS NOT NULL AND (char_length(btrim(p_body_type)) = 0 OR char_length(p_body_type) > 120))
     OR (p_drive_type IS NOT NULL AND p_drive_type NOT IN ('front', 'rear', 'awd', '4x4'))
     OR (p_color IS NOT NULL AND (char_length(btrim(p_color)) = 0 OR char_length(p_color) > 80))
     OR (p_engine_volume_l IS NOT NULL AND (p_engine_volume_l <= 0 OR p_engine_volume_l > 999.9 OR p_engine_volume_l IS DISTINCT FROM trunc(p_engine_volume_l, 1)))
     OR (p_damage_state IS NOT NULL AND p_damage_state NOT IN ('unknown', 'none', 'minor', 'major', 'painted', 'replaced', 'heavy_damage'))
     OR (p_owner_count IS NOT NULL AND p_owner_count <= 0)
     OR p_description IS NOT NULL AND char_length(p_description) > 8000
     OR p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$'
     OR p_price_negotiable IS NULL OR v_price_amount <= 0
     OR p_city IS NULL OR char_length(btrim(p_city)) = 0 OR char_length(p_city) > 120
     OR (p_fuel_type = 'electric' AND p_engine_volume_l IS NOT NULL)
     OR (p_fuel_type <> 'electric' AND p_engine_volume_l IS NULL)
     OR (p_district_id IS NOT NULL AND p_city_id IS NULL) THEN
    RAISE EXCEPTION 'invalid listing create fields' USING ERRCODE = 'OT422';
  END IF;

  SELECT profile.seller_type
  INTO v_seller_type
  FROM public.profiles AS profile
  WHERE profile.id = v_user_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'seller profile required' USING ERRCODE = 'OT403';
  END IF;

  SELECT concat_ws(' ',
    NULLIF(btrim(regexp_replace(make.name, '[' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || ' ]+', ' ', 'g')), ''),
    NULLIF(btrim(regexp_replace(model.name, '[' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || ' ]+', ' ', 'g')), ''),
    p_year::TEXT)
  INTO v_title
  FROM vehicle.makes AS make
  JOIN vehicle.models AS model ON model.make_id = make.id
  WHERE make.id = p_make_id
    AND model.id = p_model_id
    AND make.is_active = TRUE
    AND model.is_active = TRUE;
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'invalid make and model' USING ERRCODE = 'OT422';
  END IF;

  IF p_variant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM vehicle.variants AS variant
    WHERE variant.id = p_variant_id AND variant.model_id = p_model_id AND variant.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'invalid model and variant' USING ERRCODE = 'OT422';
  END IF;

  IF p_city_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM marketplace.cities AS city WHERE city.id = p_city_id AND city.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'invalid city' USING ERRCODE = 'OT422';
  END IF;
  IF p_district_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM marketplace.districts AS district
    WHERE district.id = p_district_id AND district.city_id = p_city_id AND district.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'invalid city and district' USING ERRCODE = 'OT422';
  END IF;

  INSERT INTO vehicle.vehicle_profiles (
    make_id, model_id, variant_id, year, mileage_km, condition, fuel_type,
    transmission, body_type, drive_type, color, engine_volume_l, damage_state,
    owner_count, created_source, profile_status, created_by
  ) VALUES (
    p_make_id, p_model_id, p_variant_id, p_year, p_mileage_km, p_condition,
    p_fuel_type, p_transmission, NULLIF(btrim(p_body_type), ''), p_drive_type,
    NULLIF(btrim(p_color), ''), p_engine_volume_l, p_damage_state, p_owner_count,
    'manual', 'active', v_user_id
  ) RETURNING id INTO v_vehicle_profile_id;

  INSERT INTO vehicle.profile_ownership (
    vehicle_profile_id, owner_id, ownership_type, is_current, started_at, ended_at
  ) VALUES (v_vehicle_profile_id, v_user_id, 'owner', TRUE, now(), NULL);

  INSERT INTO marketplace.listings (
    vehicle_profile_id, seller_id, seller_type, status, moderation_status,
    title, title_generated, description, price_amount, currency,
    price_negotiable, city, city_id, district_id
  ) VALUES (
    v_vehicle_profile_id, v_user_id, v_seller_type, 'draft', 'pending_review',
    v_title, TRUE, NULLIF(btrim(p_description), ''), v_price_amount, p_currency,
    p_price_negotiable, btrim(p_city), p_city_id, p_district_id
  ) RETURNING id, marketplace.listings.created_at INTO v_listing_id, v_created_at;

  RETURN QUERY SELECT v_listing_id, v_vehicle_profile_id, v_created_at;
END;
$function$;

-- public.attach_own_listing_media
CREATE OR REPLACE FUNCTION public.attach_own_listing_media(
  p_listing_id UUID,
  p_media_id UUID,
  p_storage_path TEXT,
  p_original_path TEXT,
  p_large_path TEXT,
  p_card_path TEXT,
  p_thumb_path TEXT,
  p_sort_order SMALLINT,
  p_is_cover BOOLEAN,
  p_width INTEGER DEFAULT NULL,
  p_height INTEGER DEFAULT NULL,
  p_aspect_ratio NUMERIC DEFAULT NULL,
  p_mime_type TEXT DEFAULT NULL,
  p_size_bytes BIGINT DEFAULT NULL,
  p_processed_status TEXT DEFAULT 'processed'
)
RETURNS TABLE (media_id UUID, sort_order SMALLINT, is_cover BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_vehicle_profile_id UUID;
  v_existing RECORD;
  v_path RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF p_listing_id IS NULL OR p_media_id IS NULL OR p_storage_path IS NULL
     OR char_length(btrim(p_storage_path)) = 0 OR p_sort_order IS NULL OR p_sort_order < 0
     OR p_is_cover IS NULL
     OR (p_width IS NOT NULL AND p_width <= 0)
     OR (p_height IS NOT NULL AND p_height <= 0)
     OR (p_aspect_ratio IS NOT NULL AND p_aspect_ratio <= 0)
     OR (p_mime_type IS NOT NULL AND p_mime_type NOT IN ('image/jpeg', 'image/png', 'image/webp'))
     OR (p_size_bytes IS NOT NULL AND p_size_bytes <= 0)
     OR p_processed_status IS NULL OR p_processed_status NOT IN ('processed', 'failed') THEN
    RAISE EXCEPTION 'invalid media attachment' USING ERRCODE = 'OT422';
  END IF;

  SELECT listing.vehicle_profile_id
  INTO v_vehicle_profile_id
  FROM marketplace.listings AS listing
  WHERE listing.id = p_listing_id
    AND listing.seller_id = v_user_id
    AND listing.status = 'draft'
    AND listing.moderation_status = 'pending_review'
    AND listing.archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR NOT vehicle.is_current_profile_owner(v_vehicle_profile_id, v_user_id) THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  SELECT media.id, media.sort_order, media.is_cover
  INTO v_existing
  FROM vehicle.profile_media AS media
  WHERE media.id = p_media_id
  FOR UPDATE;
  IF FOUND THEN
    IF (SELECT media.vehicle_profile_id FROM vehicle.profile_media AS media WHERE media.id = p_media_id) <> v_vehicle_profile_id THEN
      RAISE EXCEPTION 'media identifier conflict' USING ERRCODE = 'OT409';
    END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.sort_order, v_existing.is_cover;
    RETURN;
  END IF;

  FOR v_path IN
    SELECT * FROM (VALUES
      ('storage', p_storage_path), ('original', p_original_path), ('large', p_large_path),
      ('card', p_card_path), ('thumb', p_thumb_path)
    ) AS paths(variant_name, object_path)
    WHERE object_path IS NOT NULL
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM storage.objects AS object
      WHERE object.bucket_id = 'listing-media'
        AND object.name = v_path.object_path
        AND COALESCE(object.owner_id, object.owner::TEXT) = v_user_id::TEXT
        AND vehicle.profile_media_path_matches(
          object.name, v_user_id, v_vehicle_profile_id, p_media_id, v_path.variant_name
        )
        AND COALESCE(object.metadata ->> 'mimetype', '') IN ('image/jpeg', 'image/png', 'image/webp')
    ) THEN
      RAISE EXCEPTION 'media object is not authorized for this listing' USING ERRCODE = 'OT403';
    END IF;
  END LOOP;

  IF p_is_cover THEN
    UPDATE vehicle.profile_media AS media
    SET is_cover = FALSE
    WHERE media.vehicle_profile_id = v_vehicle_profile_id
      AND media.is_cover = TRUE;
  END IF;

  INSERT INTO vehicle.profile_media (
    id, vehicle_profile_id, storage_path, url, original_path, large_path,
    card_path, thumb_path, media_type, sort_order, is_cover, width, height,
    aspect_ratio, mime_type, size_bytes, processed_status, blur_status
  ) VALUES (
    p_media_id, v_vehicle_profile_id, p_storage_path, p_storage_path, p_original_path,
    p_large_path, p_card_path, p_thumb_path, 'image', p_sort_order, p_is_cover,
    p_width, p_height, p_aspect_ratio, p_mime_type, p_size_bytes,
    p_processed_status, 'not_started'
  );

  IF p_is_cover THEN
    PERFORM public.set_own_listing_cover_media(p_listing_id, p_media_id);
  END IF;

  RETURN QUERY SELECT p_media_id, p_sort_order, p_is_cover;
END;
$$;

-- public.finalize_own_listing_sanitized_photo
CREATE OR REPLACE FUNCTION public.finalize_own_listing_sanitized_photo(
  p_listing_id UUID, p_media_id UUID, p_temp_path TEXT,
  p_sanitized_master_path TEXT, p_large_path TEXT, p_card_path TEXT,
  p_thumb_path TEXT, p_sort_order SMALLINT, p_is_cover BOOLEAN,
  p_width INTEGER, p_height INTEGER, p_aspect_ratio NUMERIC,
  p_mime_type TEXT, p_size_bytes BIGINT
)
RETURNS TABLE(media_id UUID, sort_order SMALLINT, is_cover BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_user UUID := auth.uid();
  v_profile UUID;
  v_path TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF p_listing_id IS NULL OR p_media_id IS NULL OR p_sort_order IS NULL OR p_sort_order < 0
    OR p_is_cover IS NULL OR p_width <= 0 OR p_height <= 0 OR p_aspect_ratio <= 0
    OR p_mime_type NOT IN ('image/jpeg', 'image/png', 'image/webp') OR p_size_bytes <= 0 THEN
    RAISE EXCEPTION 'invalid sanitized media' USING ERRCODE = 'OT422';
  END IF;

  SELECT l.vehicle_profile_id INTO v_profile
  FROM marketplace.listings l
  WHERE l.id = p_listing_id AND l.seller_id = v_user AND l.status = 'draft'
    AND l.moderation_status IN ('draft', 'pending_review') AND l.archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR NOT vehicle.is_current_profile_owner(v_profile, v_user) THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;
  IF p_temp_path !~ ('^temp/' || v_user::TEXT || '/[0-9a-f-]{36}/[^/]+$')
    OR NOT EXISTS (
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id = 'listing-media' AND o.name = p_temp_path
        AND coalesce(o.owner_id, o.owner::TEXT) = v_user::TEXT
    ) THEN RAISE EXCEPTION 'temporary source not found' USING ERRCODE = 'OT403'; END IF;
  FOREACH v_path IN ARRAY ARRAY[p_sanitized_master_path, p_large_path, p_card_path, p_thumb_path] LOOP
    IF v_path IS NULL
      OR v_path !~ ('^public/' || v_profile::TEXT || '/' || p_media_id::TEXT || '/(master|large|card|thumb)[.](webp|jpg|jpeg|png)$')
      OR NOT EXISTS (
        SELECT 1 FROM storage.objects o
        WHERE o.bucket_id = 'listing-media' AND o.name = v_path AND o.owner_id IS NULL
      ) THEN RAISE EXCEPTION 'sanitized derivative not authorized' USING ERRCODE = 'OT403'; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM vehicle.profile_media pm WHERE pm.id = p_media_id) THEN
    RAISE EXCEPTION 'media identifier conflict' USING ERRCODE = 'OT409';
  END IF;
  IF p_is_cover THEN
    UPDATE vehicle.profile_media pm SET is_cover = FALSE
    WHERE pm.vehicle_profile_id = v_profile AND pm.is_cover;
  END IF;
  INSERT INTO vehicle.profile_media (
    id, vehicle_profile_id, storage_path, url, original_path, large_path, card_path, thumb_path,
    media_type, sort_order, is_cover, width, height, aspect_ratio, mime_type, size_bytes,
    processed_status, blur_status, privacy_version, sanitized_at
  ) VALUES (
    p_media_id, v_profile, p_large_path, p_large_path, p_sanitized_master_path, p_large_path,
    p_card_path, p_thumb_path, 'image', p_sort_order, p_is_cover, p_width, p_height,
    p_aspect_ratio, p_mime_type, p_size_bytes, 'processed', 'blurred', 1, now()
  );
  IF p_is_cover THEN PERFORM public.set_own_listing_cover_media(p_listing_id, p_media_id); END IF;
  RETURN QUERY SELECT p_media_id, p_sort_order, p_is_cover;
END;
$$;

-- public.create_own_private_listing_draft
CREATE OR REPLACE FUNCTION public.create_own_private_listing_draft(
  p_make_id UUID, p_model_id UUID, p_variant_id UUID, p_year SMALLINT,
  p_mileage_km INTEGER, p_condition TEXT, p_fuel_type vehicle.fuel_type,
  p_transmission vehicle.transmission_type, p_body_type TEXT, p_drive_type TEXT,
  p_color TEXT, p_engine_volume_l NUMERIC, p_damage_state TEXT,
  p_owner_count SMALLINT, p_description TEXT, p_price_amount_text TEXT,
  p_currency TEXT, p_price_negotiable BOOLEAN, p_city TEXT,
  p_city_id UUID DEFAULT NULL, p_district_id UUID DEFAULT NULL
)
RETURNS TABLE(listing_id UUID, vehicle_profile_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_created RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  SELECT * INTO v_created FROM public.create_own_listing_draft(
    p_make_id, p_model_id, p_variant_id, p_year, p_mileage_km, p_condition,
    p_fuel_type, p_transmission, p_body_type, p_drive_type, p_color,
    p_engine_volume_l, p_damage_state, p_owner_count, p_description,
    p_price_amount_text, p_currency, p_price_negotiable, p_city, p_city_id,
    p_district_id
  );

  UPDATE marketplace.listings
  SET moderation_status = 'draft'
  WHERE id = v_created.listing_id
    AND seller_id = auth.uid()
    AND status = 'draft'
    AND moderation_status = 'pending_review';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'private draft transition failed' USING ERRCODE = 'OT409';
  END IF;

  RETURN QUERY SELECT v_created.listing_id, v_created.vehicle_profile_id, v_created.created_at;
END;
$$;

-- public.save_own_listing_edit
CREATE OR REPLACE FUNCTION public.save_own_listing_edit(
  p_listing_id UUID, p_expected_listing_updated_at TIMESTAMPTZ,
  p_expected_vehicle_updated_at TIMESTAMPTZ, p_make_id UUID, p_model_id UUID,
  p_year SMALLINT, p_mileage_km INTEGER, p_condition TEXT,
  p_fuel_type vehicle.fuel_type, p_transmission vehicle.transmission_type,
  p_body_type TEXT, p_drive_type TEXT, p_color TEXT, p_engine_volume_l NUMERIC,
  p_damage_state TEXT, p_owner_count SMALLINT, p_description TEXT,
  p_price_amount_text TEXT, p_currency TEXT, p_price_negotiable BOOLEAN, p_city TEXT
)
RETURNS TABLE(saved_listing_id UUID, saved_listing_updated_at TIMESTAMPTZ,
  saved_vehicle_updated_at TIMESTAMPTZ, saved_status TEXT, saved_moderation_status TEXT,
  saved_title TEXT, saved_title_generated BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_user_id UUID := auth.uid(); v_draft BOOLEAN; v_saved RECORD;
  v_transition_updated_at TIMESTAMPTZ; v_updated TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT l.status = 'draft' AND l.moderation_status = 'draft' INTO v_draft
  FROM marketplace.listings l WHERE l.id = p_listing_id AND l.seller_id = v_user_id FOR UPDATE;

  IF COALESCE(v_draft, FALSE) THEN
    -- The legacy edit routine uses an optimistic lock. Preserve its expected
    -- timestamp after this transaction-local lifecycle bridge updates the row.
    UPDATE marketplace.listings SET moderation_status = 'pending_review'
    WHERE id = p_listing_id AND seller_id = v_user_id AND moderation_status = 'draft'
    RETURNING updated_at INTO v_transition_updated_at;
  END IF;

  SELECT * INTO v_saved FROM public.save_own_rejected_listing(
    p_listing_id, COALESCE(v_transition_updated_at, p_expected_listing_updated_at),
    p_expected_vehicle_updated_at, p_make_id, p_model_id, p_year, p_mileage_km,
    p_condition, p_fuel_type, p_transmission, p_body_type, p_drive_type, p_color,
    p_engine_volume_l, p_damage_state, p_owner_count, p_description, p_price_amount_text,
    p_currency, p_price_negotiable, p_city);

  IF COALESCE(v_draft, FALSE) THEN
    UPDATE marketplace.listings SET moderation_status = 'draft'
    WHERE id = p_listing_id AND seller_id = v_user_id AND moderation_status = 'pending_review'
    RETURNING updated_at INTO v_updated;
    IF NOT FOUND THEN RAISE EXCEPTION 'private draft transition failed' USING ERRCODE = 'OT409'; END IF;
    RETURN QUERY SELECT v_saved.saved_listing_id, v_updated, v_saved.saved_vehicle_updated_at,
      'draft', 'draft', v_saved.saved_title, v_saved.saved_title_generated;
  ELSE
    RETURN QUERY SELECT v_saved.saved_listing_id, v_saved.saved_listing_updated_at,
      v_saved.saved_vehicle_updated_at, v_saved.saved_status, v_saved.saved_moderation_status,
      v_saved.saved_title, v_saved.saved_title_generated;
  END IF;
END;
$$;

-- public.sync_own_verified_account_phone
CREATE OR REPLACE FUNCTION public.sync_own_verified_account_phone()
RETURNS TABLE(outcome TEXT, contact_id UUID) LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_phone_e164 TEXT; v_phone_confirmed_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
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

-- public.create_own_listing_draft_v2
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
DECLARE v_user_id UUID := auth.uid(); v_created RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
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

-- public.set_own_listing_seller_contact_phone
CREATE OR REPLACE FUNCTION public.set_own_listing_seller_contact_phone(
  p_listing_id UUID,
  p_seller_contact_phone_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
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

-- public.attach_own_active_listing_response
CREATE OR REPLACE FUNCTION public.attach_own_active_listing_response(p_conversation_id UUID, p_listing_id UUID)
RETURNS TABLE (conversation_id UUID, listing_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_seller_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF NOT EXISTS (SELECT 1 FROM messaging.conversations c WHERE c.id = p_conversation_id AND c.seller_id = v_user_id) THEN
    RAISE EXCEPTION 'seller response access denied' USING ERRCODE = 'OT403';
  END IF;
  SELECT l.seller_id INTO v_seller_id FROM marketplace.listings l
  WHERE l.id = p_listing_id AND l.seller_id = v_user_id AND l.status = 'active' AND l.moderation_status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'listing is not eligible' USING ERRCODE = 'OT422'; END IF;

  RETURN QUERY
  INSERT INTO messaging.conversation_listing_responses AS response (conversation_id, listing_id, seller_id)
    VALUES (p_conversation_id, p_listing_id, v_seller_id)
    ON CONFLICT ON CONSTRAINT conversation_listing_responses_pkey
    DO UPDATE SET seller_id = response.seller_id
    RETURNING response.conversation_id, response.listing_id, response.created_at;
END; $$;

-- public.remove_own_listing_media
CREATE OR REPLACE FUNCTION public.remove_own_listing_media(p_listing_id uuid, p_media_id uuid)
RETURNS TABLE(original_path text, storage_path text, large_path text, card_path text, thumb_path text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketplace, vehicle, pg_catalog AS $$
DECLARE media_record vehicle.profile_media%ROWTYPE; v_paths text[]; v_cleanup_task_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT media.* INTO media_record FROM vehicle.profile_media media JOIN marketplace.listings listing ON listing.vehicle_profile_id = media.vehicle_profile_id
  WHERE media.id = p_media_id AND listing.id = p_listing_id AND listing.seller_id = auth.uid()
    AND listing.status = 'draft' AND listing.moderation_status IN ('pending_review', 'rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'media is not owned by this seller' USING ERRCODE = 'OT403'; END IF;
  v_paths := ARRAY(SELECT DISTINCT path FROM unnest(ARRAY[media_record.original_path, media_record.storage_path, media_record.large_path, media_record.card_path, media_record.thumb_path]) AS path WHERE path IS NOT NULL AND btrim(path) <> '');
  INSERT INTO public.listing_media_cleanup_tasks(listing_id, seller_id, media_id, storage_paths)
  VALUES (p_listing_id, auth.uid(), p_media_id, v_paths) RETURNING id INTO v_cleanup_task_id;
  DELETE FROM vehicle.profile_media WHERE id = media_record.id;
  RETURN QUERY SELECT media_record.original_path, media_record.storage_path, media_record.large_path, media_record.card_path, media_record.thumb_path;
END;
$$;

-- marketplace.manage_dealer_staff_member
CREATE OR REPLACE FUNCTION marketplace.manage_dealer_staff_member(
  p_dealer_id UUID,
  p_user_id UUID,
  p_role marketplace.dealer_staff_role
)
RETURNS marketplace.dealer_staff_memberships
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_is_owner BOOLEAN;
  v_target_role marketplace.dealer_staff_role;
  v_result marketplace.dealer_staff_memberships;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor IS NULL OR p_user_id IS NULL OR p_dealer_id IS NULL OR p_dealer_id = p_user_id THEN
    RAISE EXCEPTION 'invalid dealer membership' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_dealer_id AND seller_type = 'dealer') THEN
    RAISE EXCEPTION 'dealer profile required' USING ERRCODE = '42501';
  END IF;

  v_actor_is_owner := v_actor = p_dealer_id;
  IF NOT v_actor_is_owner
     AND marketplace.dealer_staff_role_for(p_dealer_id, v_actor) IS DISTINCT FROM 'manager'::marketplace.dealer_staff_role THEN
    RAISE EXCEPTION 'dealer owner or manager required' USING ERRCODE = '42501';
  END IF;
  IF p_role = 'owner' THEN
    RAISE EXCEPTION 'owner role is reserved for dealer account' USING ERRCODE = '22023';
  END IF;

  IF NOT v_actor_is_owner THEN
    SELECT role INTO v_target_role
    FROM marketplace.dealer_staff_memberships
    WHERE dealer_id = p_dealer_id AND user_id = p_user_id
    FOR UPDATE;
    IF p_role <> 'staff'::marketplace.dealer_staff_role
       OR (v_target_role IS NOT NULL AND v_target_role <> 'staff'::marketplace.dealer_staff_role) THEN
      RAISE EXCEPTION 'managers may manage staff role only' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO marketplace.dealer_staff_memberships (dealer_id, user_id, role)
  VALUES (p_dealer_id, p_user_id, p_role)
  ON CONFLICT (dealer_id, user_id) DO UPDATE SET role = EXCLUDED.role
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

-- marketplace.remove_dealer_staff_member
CREATE OR REPLACE FUNCTION marketplace.remove_dealer_staff_member(
  p_dealer_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_is_owner BOOLEAN;
  v_target_role marketplace.dealer_staff_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor IS NULL OR p_user_id IS NULL OR p_dealer_id IS NULL THEN
    RAISE EXCEPTION 'invalid dealer membership' USING ERRCODE = '22023';
  END IF;
  v_actor_is_owner := v_actor = p_dealer_id;
  IF NOT v_actor_is_owner
     AND marketplace.dealer_staff_role_for(p_dealer_id, v_actor) IS DISTINCT FROM 'manager'::marketplace.dealer_staff_role THEN
    RAISE EXCEPTION 'dealer owner or manager required' USING ERRCODE = '42501';
  END IF;

  IF NOT v_actor_is_owner THEN
    SELECT role INTO v_target_role
    FROM marketplace.dealer_staff_memberships
    WHERE dealer_id = p_dealer_id AND user_id = p_user_id
    FOR UPDATE;
    IF v_target_role IS DISTINCT FROM 'staff'::marketplace.dealer_staff_role THEN
      RAISE EXCEPTION 'managers may remove staff role only' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- This is the narrowly authorized membership-removal path; table grants
  -- still prevent direct authenticated DELETE access.
  IF p_dealer_id IS NOT NULL THEN DELETE FROM marketplace.dealer_staff_memberships
    WHERE dealer_id = p_dealer_id AND user_id = p_user_id; END IF;
END;
$$;

-- public.raise_own_listing
CREATE OR REPLACE FUNCTION public.raise_own_listing(p_listing_id UUID)
RETURNS TABLE(listing_id UUID, raised_at TIMESTAMPTZ, next_raise_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, public, pg_catalog AS $$
DECLARE v_actor_id UUID := auth.uid(); v_listing marketplace.listings%ROWTYPE; v_now TIMESTAMPTZ := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT * INTO v_listing FROM marketplace.listings WHERE id = p_listing_id AND seller_id = v_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  IF v_listing.status <> 'active' OR v_listing.moderation_status <> 'active' THEN RAISE EXCEPTION 'listing is not eligible to raise' USING ERRCODE = 'OT422'; END IF;
  IF v_listing.raised_at IS NOT NULL AND v_listing.raised_at + interval '7 days' > v_now THEN RAISE EXCEPTION 'listing raise cooldown active' USING ERRCODE = 'OT409'; END IF;
  UPDATE marketplace.listings SET raised_at = v_now WHERE id = p_listing_id RETURNING id, marketplace.listings.raised_at INTO listing_id, raised_at;
  PERFORM marketplace.refresh_listing_search_document(p_listing_id);
  INSERT INTO public.admin_audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (v_actor_id, 'listing.raised', 'listing', p_listing_id, jsonb_build_object('raised_at', raised_at, 'next_raise_at', raised_at + interval '7 days'));
  next_raise_at := raised_at + interval '7 days';
  RETURN NEXT;
END;$$;

-- marketplace.submit_own_dealer_verification
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
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

-- public.get_own_listing_media_cleanup_task
CREATE OR REPLACE FUNCTION public.get_own_listing_media_cleanup_task(p_listing_id uuid, p_cleanup_task_id uuid)
RETURNS TABLE(storage_paths text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  UPDATE public.listing_media_cleanup_tasks SET attempts = attempts + 1, last_attempt_at = now()
  WHERE id = p_cleanup_task_id AND listing_id = p_listing_id AND seller_id = auth.uid() AND status = 'pending'
  RETURNING listing_media_cleanup_tasks.storage_paths INTO storage_paths;
  IF NOT FOUND THEN RAISE EXCEPTION 'cleanup task not found' USING ERRCODE = 'OT404'; END IF;
  RETURN NEXT;
END;
$$;

-- public.complete_own_listing_media_cleanup_task
CREATE OR REPLACE FUNCTION public.complete_own_listing_media_cleanup_task(p_listing_id uuid, p_cleanup_task_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  UPDATE public.listing_media_cleanup_tasks SET status = 'completed', completed_at = now()
  WHERE id = p_cleanup_task_id AND listing_id = p_listing_id AND seller_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'cleanup task not found' USING ERRCODE = 'OT404'; END IF;
END;
$$;

-- marketplace.create_dealer_lead
CREATE OR REPLACE FUNCTION marketplace.create_dealer_lead(
  p_dealer_id UUID,
  p_source marketplace.dealer_lead_source,
  p_source_record_id UUID,
  p_listing_id UUID DEFAULT NULL,
  p_vehicle_profile_id UUID DEFAULT NULL,
  p_buyer_request_id UUID DEFAULT NULL,
  p_manager_id UUID DEFAULT NULL
)
RETURNS marketplace.dealer_leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketplace, messaging, identity, vehicle, public, auth, pg_catalog
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_result marketplace.dealer_leads;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor_id IS NULL OR p_dealer_id IS NULL OR p_source_record_id IS NULL THEN
    RAISE EXCEPTION 'authentication and lead source are required' USING ERRCODE = 'OT401';
  END IF;
  IF v_actor_id <> p_dealer_id AND NOT EXISTS (
    SELECT 1 FROM marketplace.dealer_staff_memberships membership
    WHERE membership.dealer_id = p_dealer_id AND membership.user_id = v_actor_id
  ) THEN
    RAISE EXCEPTION 'dealer team access required' USING ERRCODE = 'OT403';
  END IF;
  IF p_source IN ('dealer_post', 'dealer_live') THEN
    RAISE EXCEPTION 'lead source is not yet ingestible' USING ERRCODE = 'OT422';
  END IF;
  IF v_actor_id <> p_dealer_id AND p_manager_id IS NOT NULL AND p_manager_id <> v_actor_id THEN
    RAISE EXCEPTION 'staff may only assign themselves' USING ERRCODE = 'OT403';
  END IF;

  INSERT INTO marketplace.dealer_leads (
    dealer_id, manager_id, listing_id, vehicle_profile_id, buyer_request_id,
    source, source_record_id
  ) VALUES (
    p_dealer_id, p_manager_id, p_listing_id, p_vehicle_profile_id, p_buyer_request_id,
    p_source, p_source_record_id
  )
  ON CONFLICT (dealer_id, source, source_record_id) DO UPDATE
    SET dealer_id = EXCLUDED.dealer_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- marketplace.update_dealer_lead
CREATE OR REPLACE FUNCTION marketplace.update_dealer_lead(
  p_lead_id UUID,
  p_status marketplace.dealer_lead_status DEFAULT NULL,
  p_manager_id UUID DEFAULT NULL,
  p_set_manager BOOLEAN DEFAULT FALSE
)
RETURNS marketplace.dealer_leads
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_lead marketplace.dealer_leads;
  v_previous_status marketplace.dealer_lead_status;
  v_previous_manager UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  SELECT * INTO v_lead FROM marketplace.dealer_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND OR v_actor IS NULL OR NOT marketplace.dealer_lead_team_access(v_lead.dealer_id, v_actor) THEN
    RAISE EXCEPTION 'dealer team access required' USING ERRCODE = 'OT403';
  END IF;

  v_previous_status := v_lead.status;
  v_previous_manager := v_lead.manager_id;
  IF p_status IS NOT NULL THEN v_lead.status := p_status; END IF;
  IF p_set_manager THEN
    IF NOT marketplace.dealer_lead_can_manage_assignments(v_lead.dealer_id, v_actor)
       AND p_manager_id IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'only owner or manager may assign other team members' USING ERRCODE = 'OT403';
    END IF;
    IF p_manager_id IS NOT NULL AND p_manager_id <> v_lead.dealer_id AND NOT EXISTS (
      SELECT 1 FROM marketplace.dealer_staff_memberships
      WHERE dealer_id = v_lead.dealer_id AND user_id = p_manager_id
    ) THEN RAISE EXCEPTION 'lead manager must belong to dealer' USING ERRCODE = 'OT422'; END IF;
    v_lead.manager_id := p_manager_id;
  END IF;

  UPDATE marketplace.dealer_leads SET status = v_lead.status, manager_id = v_lead.manager_id WHERE id = v_lead.id
  RETURNING * INTO v_lead;
  IF v_previous_status IS DISTINCT FROM v_lead.status THEN
    INSERT INTO marketplace.dealer_lead_history(lead_id, actor_id, event_type, details)
    VALUES (v_lead.id, v_actor, 'status_changed', jsonb_build_object('from', v_previous_status, 'to', v_lead.status));
  END IF;
  IF v_previous_manager IS DISTINCT FROM v_lead.manager_id THEN
    INSERT INTO marketplace.dealer_lead_history(lead_id, actor_id, event_type, details)
    VALUES (v_lead.id, v_actor, CASE WHEN v_lead.manager_id IS NULL THEN 'manager_cleared' ELSE 'manager_assigned' END,
      jsonb_build_object('from', v_previous_manager, 'to', v_lead.manager_id));
  END IF;
  RETURN v_lead;
END;
$$;

-- marketplace.add_dealer_lead_note
CREATE OR REPLACE FUNCTION marketplace.add_dealer_lead_note(p_lead_id UUID, p_body TEXT)
RETURNS marketplace.dealer_lead_notes
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE v_actor UUID := auth.uid(); v_lead marketplace.dealer_leads; v_note marketplace.dealer_lead_notes;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  SELECT * INTO v_lead FROM marketplace.dealer_leads WHERE id = p_lead_id;
  IF NOT FOUND OR v_actor IS NULL OR NOT marketplace.dealer_lead_team_access(v_lead.dealer_id, v_actor) THEN
    RAISE EXCEPTION 'dealer team access required' USING ERRCODE = 'OT403';
  END IF;
  INSERT INTO marketplace.dealer_lead_notes(lead_id, author_id, body) VALUES (p_lead_id, v_actor, p_body) RETURNING * INTO v_note;
  INSERT INTO marketplace.dealer_lead_history(lead_id, actor_id, event_type, details)
  VALUES (p_lead_id, v_actor, 'note_added', jsonb_build_object('note_id', v_note.id));
  RETURN v_note;
END;
$$;

-- marketplace.schedule_dealer_lead_follow_up
CREATE OR REPLACE FUNCTION marketplace.schedule_dealer_lead_follow_up(p_lead_id UUID, p_due_at TIMESTAMPTZ, p_body TEXT, p_assigned_to UUID DEFAULT NULL)
RETURNS marketplace.dealer_lead_follow_ups
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE v_actor UUID := auth.uid(); v_lead marketplace.dealer_leads; v_assignee UUID := COALESCE(p_assigned_to, v_actor); v_follow_up marketplace.dealer_lead_follow_ups;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  SELECT * INTO v_lead FROM marketplace.dealer_leads WHERE id = p_lead_id;
  IF NOT FOUND OR v_actor IS NULL OR NOT marketplace.dealer_lead_team_access(v_lead.dealer_id, v_actor) THEN
    RAISE EXCEPTION 'dealer team access required' USING ERRCODE = 'OT403';
  END IF;
  IF NOT marketplace.dealer_lead_can_manage_assignments(v_lead.dealer_id, v_actor) AND v_assignee <> v_actor THEN
    RAISE EXCEPTION 'only owner or manager may assign other team members' USING ERRCODE = 'OT403';
  END IF;
  IF v_assignee <> v_lead.dealer_id AND NOT EXISTS (SELECT 1 FROM marketplace.dealer_staff_memberships WHERE dealer_id = v_lead.dealer_id AND user_id = v_assignee) THEN
    RAISE EXCEPTION 'follow-up assignee must belong to dealer' USING ERRCODE = 'OT422';
  END IF;
  INSERT INTO marketplace.dealer_lead_follow_ups(lead_id, assigned_to, due_at, body, created_by)
  VALUES (p_lead_id, v_assignee, p_due_at, p_body, v_actor) RETURNING * INTO v_follow_up;
  INSERT INTO marketplace.dealer_lead_history(lead_id, actor_id, event_type, details)
  VALUES (p_lead_id, v_actor, 'follow_up_scheduled', jsonb_build_object('follow_up_id', v_follow_up.id, 'assigned_to', v_assignee));
  RETURN v_follow_up;
END;
$$;

-- marketplace.complete_dealer_lead_follow_up
CREATE OR REPLACE FUNCTION marketplace.complete_dealer_lead_follow_up(p_follow_up_id UUID)
RETURNS marketplace.dealer_lead_follow_ups
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE v_actor UUID := auth.uid(); v_follow_up marketplace.dealer_lead_follow_ups; v_dealer_id UUID; v_was_completed BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  SELECT follow_up.* INTO v_follow_up
  FROM marketplace.dealer_lead_follow_ups follow_up JOIN marketplace.dealer_leads lead ON lead.id = follow_up.lead_id
  WHERE follow_up.id = p_follow_up_id FOR UPDATE OF follow_up;
  IF FOUND THEN
    SELECT dealer_id INTO v_dealer_id FROM marketplace.dealer_leads WHERE id = v_follow_up.lead_id;
  END IF;
  IF NOT FOUND OR v_actor IS NULL OR NOT marketplace.dealer_lead_team_access(v_dealer_id, v_actor) THEN
    RAISE EXCEPTION 'dealer team access required' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor <> v_follow_up.assigned_to AND NOT marketplace.dealer_lead_can_manage_assignments(v_dealer_id, v_actor) THEN
    RAISE EXCEPTION 'only assignee, owner, or manager may complete follow-up' USING ERRCODE = 'OT403';
  END IF;
  v_was_completed := v_follow_up.completed_at IS NOT NULL;
  UPDATE marketplace.dealer_lead_follow_ups SET completed_at = COALESCE(completed_at, now()), completed_by = COALESCE(completed_by, v_actor)
  WHERE id = v_follow_up.id RETURNING * INTO v_follow_up;
  IF NOT v_was_completed THEN
    INSERT INTO marketplace.dealer_lead_history(lead_id, actor_id, event_type, details)
    VALUES (v_follow_up.lead_id, v_actor, 'follow_up_completed', jsonb_build_object('follow_up_id', v_follow_up.id));
  END IF;
  RETURN v_follow_up;
END;
$$;

-- public.create_own_dealer_post
CREATE OR REPLACE FUNCTION public.create_own_dealer_post(
  p_body TEXT DEFAULT NULL,
  p_listing_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, marketplace, vehicle, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_post_id UUID;
  v_listing_id UUID;
  v_position SMALLINT := 0;
  v_listing_ids UUID[] := COALESCE(p_listing_ids, ARRAY[]::UUID[]);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF COALESCE(btrim(p_body), '') = '' AND cardinality(v_listing_ids) = 0 THEN
    RAISE EXCEPTION 'post body or listing attachment required' USING ERRCODE = 'OT422';
  END IF;
  IF char_length(COALESCE(btrim(p_body), '')) > 5000 OR cardinality(v_listing_ids) > 8
     OR cardinality(v_listing_ids) <> cardinality(ARRAY(SELECT DISTINCT item FROM unnest(v_listing_ids) AS item)) THEN
    RAISE EXCEPTION 'invalid dealer post' USING ERRCODE = 'OT422';
  END IF;
  IF NOT public.is_verified_dealer(v_actor) THEN
    RAISE EXCEPTION 'verified dealer required' USING ERRCODE = 'OT403';
  END IF;

  FOREACH v_listing_id IN ARRAY v_listing_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM marketplace.listings listing
      WHERE listing.id = v_listing_id AND listing.seller_id = v_actor
        AND listing.seller_type = 'dealer' AND listing.status = 'active'
        AND listing.moderation_status = 'active' AND listing.archived_at IS NULL
        AND marketplace.is_listing_search_eligible(listing.id)
    ) THEN RAISE EXCEPTION 'dealer-owned eligible listing required' USING ERRCODE = 'OT422'; END IF;
  END LOOP;

  INSERT INTO marketplace.dealer_posts (dealer_id, body)
  VALUES (v_actor, NULLIF(btrim(p_body), '')) RETURNING id INTO v_post_id;
  FOREACH v_listing_id IN ARRAY v_listing_ids LOOP
    INSERT INTO marketplace.dealer_post_listing_attachments (post_id, listing_id, sort_order)
    VALUES (v_post_id, v_listing_id, v_position);
    v_position := v_position + 1;
  END LOOP;
  RETURN v_post_id;
END;
$$;

-- marketplace.create_own_dealer_live_stream
CREATE OR REPLACE FUNCTION marketplace.create_own_dealer_live_stream(p_title TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_stream_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF char_length(COALESCE(btrim(p_title), '')) NOT BETWEEN 1 AND 140 THEN
    RAISE EXCEPTION 'invalid live stream title' USING ERRCODE = 'OT422';
  END IF;
  IF NOT public.is_verified_dealer(v_actor) THEN
    RAISE EXCEPTION 'verified dealer required' USING ERRCODE = 'OT403';
  END IF;

  INSERT INTO marketplace.dealer_live_streams (dealer_id, title)
  VALUES (v_actor, btrim(p_title))
  RETURNING id INTO v_stream_id;
  INSERT INTO marketplace.dealer_live_state_transitions (stream_id, previous_status, next_status, actor_user_id)
  VALUES (v_stream_id, NULL, 'created', v_actor);
  RETURN v_stream_id;
END;
$$;

-- marketplace.attach_own_dealer_live_listings
CREATE OR REPLACE FUNCTION marketplace.attach_own_dealer_live_listings(
  p_stream_id UUID,
  p_listing_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, vehicle, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_listing_id UUID;
  v_position SMALLINT;
  v_listing_ids UUID[] := COALESCE(p_listing_ids, ARRAY[]::UUID[]);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF cardinality(v_listing_ids) > 8
     OR cardinality(v_listing_ids) <> cardinality(ARRAY(SELECT DISTINCT item FROM unnest(v_listing_ids) AS item)) THEN
    RAISE EXCEPTION 'invalid live listing attachments' USING ERRCODE = 'OT422';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM marketplace.dealer_live_streams stream
    WHERE stream.id = p_stream_id AND stream.dealer_id = v_actor AND stream.status = 'created'
  ) THEN RAISE EXCEPTION 'manageable created dealer live stream required' USING ERRCODE = 'OT403'; END IF;

  SELECT COALESCE(max(sort_order) + 1, 0) INTO v_position
  FROM marketplace.dealer_live_listing_attachments WHERE stream_id = p_stream_id;
  IF v_position + cardinality(v_listing_ids) > 8 THEN
    RAISE EXCEPTION 'too many live listing attachments' USING ERRCODE = 'OT422';
  END IF;

  FOREACH v_listing_id IN ARRAY v_listing_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM marketplace.listings listing
      WHERE listing.id = v_listing_id AND listing.seller_id = v_actor
        AND listing.seller_type = 'dealer' AND listing.status = 'active'
        AND listing.moderation_status = 'active' AND listing.archived_at IS NULL
        AND marketplace.is_listing_search_eligible(listing.id)
    ) THEN RAISE EXCEPTION 'dealer-owned eligible listing required' USING ERRCODE = 'OT422'; END IF;
  END LOOP;

  FOREACH v_listing_id IN ARRAY v_listing_ids LOOP
    INSERT INTO marketplace.dealer_live_listing_attachments (stream_id, listing_id, sort_order)
    VALUES (p_stream_id, v_listing_id, v_position);
    v_position := v_position + 1;
  END LOOP;
END;
$$;

-- marketplace.start_own_dealer_live_stream
CREATE OR REPLACE FUNCTION marketplace.start_own_dealer_live_stream(p_stream_id UUID)
RETURNS marketplace.dealer_live_status
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE v_actor UUID := auth.uid(); v_status marketplace.dealer_live_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF NOT public.is_verified_dealer(v_actor) THEN RAISE EXCEPTION 'verified dealer required' USING ERRCODE = 'OT403'; END IF;
  SELECT status INTO v_status FROM marketplace.dealer_live_streams
  WHERE id = p_stream_id AND dealer_id = v_actor FOR UPDATE;
  IF NOT FOUND OR v_status <> 'created' THEN RAISE EXCEPTION 'startable dealer live stream required' USING ERRCODE = 'OT409'; END IF;
  UPDATE marketplace.dealer_live_streams SET status = 'live', started_at = now() WHERE id = p_stream_id;
  INSERT INTO marketplace.dealer_live_state_transitions (stream_id, previous_status, next_status, actor_user_id)
  VALUES (p_stream_id, 'created', 'live', v_actor);
  INSERT INTO marketplace.notifications (user_id, type, live_stream_id)
  SELECT follow.follower_id, 'dealer_live_started', p_stream_id
  FROM marketplace.dealer_follows AS follow
  WHERE follow.dealer_id = v_actor
  ON CONFLICT (user_id, live_stream_id, type)
    WHERE type = 'dealer_live_started' AND live_stream_id IS NOT NULL
  DO NOTHING;
  RETURN 'live';
END;
$$;

-- marketplace.end_own_dealer_live_stream
CREATE OR REPLACE FUNCTION marketplace.end_own_dealer_live_stream(p_stream_id UUID)
RETURNS marketplace.dealer_live_status
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_status marketplace.dealer_live_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT status INTO v_status FROM marketplace.dealer_live_streams
  WHERE id = p_stream_id AND dealer_id = v_actor FOR UPDATE;
  IF NOT FOUND OR v_status <> 'live' THEN
    RAISE EXCEPTION 'endable dealer live stream required' USING ERRCODE = 'OT409';
  END IF;
  UPDATE marketplace.dealer_live_streams SET status = 'ended', ended_at = now() WHERE id = p_stream_id;
  INSERT INTO marketplace.dealer_live_state_transitions (stream_id, previous_status, next_status, actor_user_id)
  VALUES (p_stream_id, 'live', 'ended', v_actor);
  RETURN 'ended';
END;
$$;

-- marketplace.create_own_dealer_feed_api_token
CREATE OR REPLACE FUNCTION marketplace.create_own_dealer_feed_api_token(p_label TEXT DEFAULT 'Inventory API token')
RETURNS TABLE (token_id UUID, token TEXT, label TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketplace, extensions, pg_catalog AS $$
DECLARE v_dealer_id UUID := auth.uid(); v_token TEXT := encode(gen_random_bytes(32), 'hex');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_dealer_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='OT401'; END IF;
  IF NOT public.is_verified_dealer(v_dealer_id) THEN RAISE EXCEPTION 'verified dealer required' USING ERRCODE='OT403'; END IF;
  INSERT INTO marketplace.dealer_feed_api_tokens(dealer_id,token_hash,label)
  VALUES (v_dealer_id,encode(digest(v_token,'sha256'),'hex'),btrim(COALESCE(p_label,'')))
  RETURNING id, dealer_feed_api_tokens.label INTO token_id, label;
  token := v_token;
  RETURN NEXT;
END; $$;

-- marketplace.revoke_own_dealer_feed_api_token
CREATE OR REPLACE FUNCTION marketplace.revoke_own_dealer_feed_api_token(p_token_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketplace, pg_catalog AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='OT401'; END IF;
  UPDATE marketplace.dealer_feed_api_tokens SET revoked_at=now()
  WHERE id=p_token_id AND dealer_id=auth.uid() AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'active token not found' USING ERRCODE='OT404'; END IF;
END; $$;

-- public.finalize_own_listing_sanitized_photo_v2
CREATE OR REPLACE FUNCTION public.finalize_own_listing_sanitized_photo_v2(
  p_listing_id UUID, p_media_id UUID, p_temp_path TEXT,
  p_sanitized_master_path TEXT, p_large_path TEXT, p_card_path TEXT,
  p_thumb_path TEXT, p_sort_order SMALLINT, p_is_cover BOOLEAN,
  p_width INTEGER, p_height INTEGER, p_aspect_ratio NUMERIC,
  p_mime_type TEXT, p_size_bytes BIGINT, p_blur_status TEXT
)
RETURNS TABLE(media_id UUID, sort_order SMALLINT, is_cover BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_user UUID := auth.uid(); v_profile UUID; v_path TEXT; v_photo_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403';
  END IF;
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF p_listing_id IS NULL OR p_media_id IS NULL OR p_sort_order IS NULL OR p_sort_order < 0
    OR p_is_cover IS NULL OR p_width <= 0 OR p_height <= 0 OR p_aspect_ratio <= 0
    OR p_mime_type NOT IN ('image/jpeg', 'image/png', 'image/webp') OR p_size_bytes <= 0
    OR p_blur_status IS NULL OR p_blur_status NOT IN ('blurred', 'skipped') THEN
    RAISE EXCEPTION 'invalid verified privacy outcome' USING ERRCODE = 'OT422'; END IF;
  SELECT l.vehicle_profile_id INTO v_profile FROM marketplace.listings l
  WHERE l.id = p_listing_id AND l.seller_id = v_user AND l.status = 'draft'
    AND l.moderation_status IN ('draft', 'pending_review') AND l.archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT vehicle.is_current_profile_owner(v_profile, v_user) THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  IF p_temp_path !~ ('^temp/' || v_user::TEXT || '/[0-9a-f-]{36}/[^/]+$') OR NOT EXISTS (
    SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'listing-media' AND o.name = p_temp_path AND coalesce(o.owner_id, o.owner::TEXT) = v_user::TEXT
  ) THEN RAISE EXCEPTION 'temporary source not found' USING ERRCODE = 'OT403'; END IF;
  FOREACH v_path IN ARRAY ARRAY[p_sanitized_master_path, p_large_path, p_card_path, p_thumb_path] LOOP
    IF v_path IS NULL OR v_path !~ ('^public/' || v_profile::TEXT || '/' || p_media_id::TEXT || '/(master|large|card|thumb)[.](webp|jpg|jpeg|png)$') OR NOT EXISTS (
      SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'listing-media' AND o.name = v_path AND o.owner_id IS NULL
    ) THEN RAISE EXCEPTION 'sanitized derivative not authorized' USING ERRCODE = 'OT403'; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM vehicle.profile_media pm WHERE pm.id = p_media_id) THEN RAISE EXCEPTION 'media identifier conflict' USING ERRCODE = 'OT409'; END IF;
  SELECT count(*) INTO v_photo_count FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = v_profile AND pm.media_type = 'image';
  IF v_photo_count >= 15 THEN RAISE EXCEPTION 'listing photo limit reached' USING ERRCODE = 'OT422'; END IF;
  IF p_is_cover THEN UPDATE vehicle.profile_media pm SET is_cover = FALSE WHERE pm.vehicle_profile_id = v_profile AND pm.is_cover; END IF;
  INSERT INTO vehicle.profile_media (id, vehicle_profile_id, storage_path, url, original_path, large_path, card_path, thumb_path, media_type, sort_order, is_cover, width, height, aspect_ratio, mime_type, size_bytes, processed_status, blur_status, privacy_version, sanitized_at)
  VALUES (p_media_id, v_profile, p_large_path, p_large_path, p_sanitized_master_path, p_large_path, p_card_path, p_thumb_path, 'image', p_sort_order, p_is_cover, p_width, p_height, p_aspect_ratio, p_mime_type, p_size_bytes, 'processed', p_blur_status, 1, now());
  IF p_is_cover THEN PERFORM public.set_own_listing_cover_media(p_listing_id, p_media_id); END IF;
  RETURN QUERY SELECT p_media_id, p_sort_order, p_is_cover;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.can_manage_own_listing_video_storage_path(p_storage_path TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor_id UUID := auth.uid(); v_listing_id UUID; v_file_name TEXT;
BEGIN
  IF v_actor_id IS NULL OR public.is_admin(v_actor_id) OR p_storage_path IS NULL THEN RETURN FALSE; END IF;
  IF split_part(p_storage_path, '/', 1) <> v_actor_id::TEXT OR split_part(p_storage_path, '/', 2) <> 'prod04a-2026082801' OR split_part(p_storage_path, '/', 5) <> '' THEN RETURN FALSE; END IF;
  BEGIN v_listing_id := split_part(p_storage_path, '/', 3)::UUID; EXCEPTION WHEN invalid_text_representation THEN RETURN FALSE; END;
  v_file_name := split_part(p_storage_path, '/', 4);
  IF v_file_name !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$' OR NOT public.release_gate_allows_storage_write(p_storage_path) OR NOT public.is_verified_galeri(v_actor_id) THEN RETURN FALSE; END IF;
  RETURN EXISTS (SELECT 1 FROM marketplace.listings listing WHERE listing.id = v_listing_id AND listing.seller_id = v_actor_id AND listing.archived_at IS NULL AND ((listing.status = 'draft' AND listing.moderation_status = 'pending_review') OR (listing.status = 'active' AND listing.moderation_status = 'active')));
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.can_insert_own_listing_video_from_active_intent(p_storage_path TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid())
    AND marketplace.can_manage_own_listing_video_storage_path(p_storage_path)
    AND EXISTS (SELECT 1 FROM marketplace.listing_video_upload_intents intent WHERE intent.object_path = p_storage_path AND intent.owner_user_id = auth.uid() AND intent.listing_id::TEXT = split_part(p_storage_path, '/', 3) AND intent.expires_at > NOW() AND intent.consumed_at IS NULL AND intent.revoked_at IS NULL);
$$;

DROP POLICY IF EXISTS listings_insert_own ON marketplace.listings;
CREATE POLICY listings_insert_own ON marketplace.listings FOR INSERT TO authenticated WITH CHECK (
  NOT public.is_admin(auth.uid()) AND seller_id = auth.uid() AND vehicle.is_current_profile_owner(vehicle_profile_id)
  AND status = 'draft' AND moderation_status = 'pending_review' AND published_at IS NULL AND moderated_by IS NULL AND moderated_at IS NULL AND archived_at IS NULL AND rejection_reason IS NULL AND moderation_note IS NULL
);
DROP POLICY IF EXISTS listings_update_own ON marketplace.listings;
CREATE POLICY listings_update_own ON marketplace.listings FOR UPDATE TO authenticated
  USING (NOT public.is_admin(auth.uid()) AND seller_id = auth.uid())
  WITH CHECK (NOT public.is_admin(auth.uid()) AND seller_id = auth.uid() AND vehicle.is_current_profile_owner(vehicle_profile_id));
DROP POLICY IF EXISTS listings_delete_own_draft ON marketplace.listings;
CREATE POLICY listings_delete_own_draft ON marketplace.listings FOR DELETE TO authenticated
  USING (NOT public.is_admin(auth.uid()) AND seller_id = auth.uid() AND status = 'draft');

DROP POLICY IF EXISTS profile_media_insert_owner ON vehicle.profile_media;
CREATE POLICY profile_media_insert_owner ON vehicle.profile_media FOR INSERT TO authenticated WITH CHECK (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(vehicle_profile_id));
DROP POLICY IF EXISTS profile_media_update_owner ON vehicle.profile_media;
CREATE POLICY profile_media_update_owner ON vehicle.profile_media FOR UPDATE TO authenticated USING (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(vehicle_profile_id)) WITH CHECK (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(vehicle_profile_id));
DROP POLICY IF EXISTS profile_media_delete_owner ON vehicle.profile_media;
CREATE POLICY profile_media_delete_owner ON vehicle.profile_media FOR DELETE TO authenticated USING (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(vehicle_profile_id));

DROP POLICY IF EXISTS vehicle_profiles_insert_own ON vehicle.vehicle_profiles;
CREATE POLICY vehicle_profiles_insert_own ON vehicle.vehicle_profiles FOR INSERT TO authenticated WITH CHECK (NOT public.is_admin(auth.uid()) AND created_by = auth.uid() AND created_source = 'manual' AND profile_status = 'active');
DROP POLICY IF EXISTS vehicle_profiles_update_owner ON vehicle.vehicle_profiles;
CREATE POLICY vehicle_profiles_update_owner ON vehicle.vehicle_profiles FOR UPDATE TO authenticated USING (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(id)) WITH CHECK (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(id));

DROP POLICY IF EXISTS body_panel_declarations_insert_owner ON vehicle.body_panel_declarations;
CREATE POLICY body_panel_declarations_insert_owner ON vehicle.body_panel_declarations FOR INSERT TO authenticated WITH CHECK (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller');
DROP POLICY IF EXISTS body_panel_declarations_update_owner ON vehicle.body_panel_declarations;
CREATE POLICY body_panel_declarations_update_owner ON vehicle.body_panel_declarations FOR UPDATE TO authenticated USING (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller') WITH CHECK (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller');
DROP POLICY IF EXISTS body_panel_declarations_delete_owner ON vehicle.body_panel_declarations;
CREATE POLICY body_panel_declarations_delete_owner ON vehicle.body_panel_declarations FOR DELETE TO authenticated USING (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller');

DROP POLICY IF EXISTS profile_fact_evidence_insert_seller_owner ON vehicle.profile_fact_evidence;
CREATE POLICY profile_fact_evidence_insert_seller_owner ON vehicle.profile_fact_evidence FOR INSERT TO authenticated WITH CHECK (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller' AND evidence_kind = 'seller_statement');
DROP POLICY IF EXISTS profile_fact_evidence_update_seller_owner ON vehicle.profile_fact_evidence;
CREATE POLICY profile_fact_evidence_update_seller_owner ON vehicle.profile_fact_evidence FOR UPDATE TO authenticated USING (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller') WITH CHECK (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller' AND evidence_kind = 'seller_statement');
DROP POLICY IF EXISTS profile_fact_evidence_delete_seller_owner ON vehicle.profile_fact_evidence;
CREATE POLICY profile_fact_evidence_delete_seller_owner ON vehicle.profile_fact_evidence FOR DELETE TO authenticated USING (NOT public.is_admin(auth.uid()) AND vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller');

DROP POLICY IF EXISTS listing_media_insert_temp_own ON storage.objects;
CREATE POLICY listing_media_insert_temp_own ON storage.objects FOR INSERT TO authenticated WITH CHECK (NOT public.is_admin(auth.uid()) AND bucket_id = 'listing-media' AND (storage.foldername(name))[1] = 'temp' AND (storage.foldername(name))[2] = auth.uid()::TEXT);
DROP POLICY IF EXISTS listing_media_update_temp_own ON storage.objects;
CREATE POLICY listing_media_update_temp_own ON storage.objects FOR UPDATE TO authenticated USING (NOT public.is_admin(auth.uid()) AND bucket_id = 'listing-media' AND (storage.foldername(name))[1] = 'temp' AND (storage.foldername(name))[2] = auth.uid()::TEXT) WITH CHECK (NOT public.is_admin(auth.uid()) AND bucket_id = 'listing-media' AND (storage.foldername(name))[1] = 'temp' AND (storage.foldername(name))[2] = auth.uid()::TEXT);
DROP POLICY IF EXISTS listing_media_delete_temp_own ON storage.objects;
CREATE POLICY listing_media_delete_temp_own ON storage.objects FOR DELETE TO authenticated USING (NOT public.is_admin(auth.uid()) AND bucket_id = 'listing-media' AND (storage.foldername(name))[1] = 'temp' AND (storage.foldername(name))[2] = auth.uid()::TEXT);

DROP POLICY IF EXISTS vehicle_photos_insert_own_folder ON storage.objects;
CREATE POLICY vehicle_photos_insert_own_folder ON storage.objects FOR INSERT TO authenticated WITH CHECK (NOT public.is_admin(auth.uid()) AND public.release_gate_allows_storage_write(name) AND bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
DROP POLICY IF EXISTS vehicle_photos_update_own_folder ON storage.objects;
CREATE POLICY vehicle_photos_update_own_folder ON storage.objects FOR UPDATE TO authenticated USING (NOT public.is_admin(auth.uid()) AND public.release_gate_allows_storage_write(name) AND bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT) WITH CHECK (NOT public.is_admin(auth.uid()) AND public.release_gate_allows_storage_write(name) AND bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
DROP POLICY IF EXISTS vehicle_photos_delete_own_folder ON storage.objects;
CREATE POLICY vehicle_photos_delete_own_folder ON storage.objects FOR DELETE TO authenticated USING (NOT public.is_admin(auth.uid()) AND public.release_gate_allows_storage_write(name) AND bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

DROP POLICY IF EXISTS listings_update_admins ON marketplace.listings;
NOTIFY pgrst, 'reload schema';
COMMIT;
