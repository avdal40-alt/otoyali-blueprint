BEGIN;

-- Browser roles must use narrow owner-only RPCs. The historical column grant
-- allowed a listing owner to write presentation and system-derived columns
-- directly under the broad ownership policy.
REVOKE UPDATE ON marketplace.listings FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_own_rejected_listing_for_edit(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  SELECT jsonb_build_object(
    'listing', jsonb_build_object(
      'id', l.id, 'title', l.title, 'description', l.description,
      'price_amount', l.price_amount::TEXT, 'currency', l.currency::TEXT,
      'price_negotiable', l.price_negotiable, 'city', l.city,
      'seller_type', l.seller_type, 'title_generated', l.title_generated,
      'rejection_reason', l.rejection_reason, 'moderation_note', l.moderation_note,
      'updated_at', l.updated_at, 'vehicle_profile_id', l.vehicle_profile_id,
      'status', l.status, 'moderation_status', l.moderation_status
    ),
    'vehicle', jsonb_build_object(
      'make_id', vp.make_id, 'model_id', vp.model_id, 'year', vp.year,
      'mileage_km', vp.mileage_km, 'condition', vp.condition,
      'fuel_type', vp.fuel_type, 'transmission', vp.transmission,
      'body_type', vp.body_type, 'drive_type', vp.drive_type, 'color', vp.color,
      'engine_volume_l', vp.engine_volume_l, 'damage_state', vp.damage_state,
      'owner_count', vp.owner_count, 'updated_at', vp.updated_at
    ),
    'media', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pm.id, 'url', pm.url, 'thumb_url', pm.thumb_url,
        'card_url', pm.card_url, 'large_url', pm.large_url,
        'is_cover', pm.is_cover, 'sort_order', pm.sort_order
      ) ORDER BY pm.sort_order, pm.created_at, pm.id)
      FROM vehicle.profile_media AS pm
      WHERE pm.vehicle_profile_id = l.vehicle_profile_id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM marketplace.listings AS l
  JOIN vehicle.vehicle_profiles AS vp ON vp.id = l.vehicle_profile_id
  WHERE l.id = p_listing_id
    AND l.seller_id = v_user_id
    AND vp.created_by = v_user_id
    AND vehicle.is_current_profile_owner(vp.id, v_user_id)
    AND l.archived_at IS NULL
    AND (
      (l.status = 'removed' AND l.moderation_status = 'rejected')
      OR (l.status = 'active' AND l.moderation_status = 'active')
      OR (l.status = 'draft' AND l.moderation_status = 'pending_review')
    );

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;
  RETURN v_result;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.set_own_listing_cover_media(p_listing_id UUID, p_cover_media_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE v_user_id UUID := auth.uid(); v_vehicle_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT vehicle_profile_id INTO v_vehicle_id FROM marketplace.listings
  WHERE id = p_listing_id AND seller_id = v_user_id AND status = 'draft' AND moderation_status = 'pending_review' AND archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR NOT vehicle.is_current_profile_owner(v_vehicle_id, v_user_id) THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;
  IF p_cover_media_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM vehicle.profile_media WHERE id = p_cover_media_id AND vehicle_profile_id = v_vehicle_id AND is_cover = TRUE
  ) THEN RAISE EXCEPTION 'invalid cover media' USING ERRCODE = 'OT422'; END IF;
  UPDATE marketplace.listings SET cover_media_id = p_cover_media_id WHERE id = p_listing_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) FROM service_role;
REVOKE ALL ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.save_own_rejected_listing(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.save_own_rejected_listing(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.set_own_listing_cover_media(UUID, UUID) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.set_own_listing_cover_media(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) IS 'FUNCTIONAL-02J owner-only listing editor loader for rejected, active, and draft review states.';
COMMENT ON FUNCTION public.save_own_rejected_listing(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) IS 'FUNCTIONAL-02J owner-only explicit listing and vehicle edit allowlist; active edits re-enter moderation.';
COMMENT ON FUNCTION public.set_own_listing_cover_media(UUID, UUID) IS 'FUNCTIONAL-02J owner-only draft cover-media assignment; media must belong to the listing vehicle.';
NOTIFY pgrst, 'reload schema';
COMMIT;
