BEGIN;

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
      'seller_type', l.seller_type, 'seller_display_name', l.seller_display_name,
      'quality_score', l.quality_score, 'title_generated', l.title_generated,
      'rejection_reason', l.rejection_reason, 'moderation_note', l.moderation_note,
      'moderated_at', l.moderated_at, 'updated_at', l.updated_at,
      'vehicle_profile_id', l.vehicle_profile_id
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
    AND l.status IN ('draft', 'removed')
    AND l.moderation_status = 'rejected'
    AND l.archived_at IS NULL;

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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF p_listing_id IS NULL OR p_expected_listing_updated_at IS NULL
     OR p_expected_vehicle_updated_at IS NULL THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  IF p_price_amount_text IS NULL OR p_price_amount_text !~ '^[0-9]+$'
     OR length(p_price_amount_text) > 19
     OR (length(p_price_amount_text) = 19 AND p_price_amount_text > '9223372036854775807')
     OR p_price_amount_text::NUMERIC <= 0 THEN
    RAISE EXCEPTION 'invalid price amount' USING ERRCODE = 'OT422';
  END IF;
  v_price_amount := p_price_amount_text::BIGINT;

  IF p_make_id IS NULL OR p_model_id IS NULL OR p_year IS NULL
     OR p_year < 1900 OR p_year > EXTRACT(YEAR FROM NOW())::INTEGER + 1
     OR p_mileage_km IS NULL OR p_mileage_km < 0
     OR p_condition IS NOT NULL AND p_condition NOT IN ('used', 'new')
     OR p_fuel_type IS NULL OR p_transmission IS NULL
     OR p_drive_type IS NOT NULL AND p_drive_type NOT IN ('front', 'rear', 'awd', '4x4')
     OR p_damage_state IS NOT NULL AND p_damage_state NOT IN ('unknown', 'none', 'minor', 'major', 'painted', 'replaced', 'heavy_damage')
     OR p_owner_count IS NOT NULL AND p_owner_count <= 0
     OR p_engine_volume_l IS NOT NULL AND (
       p_engine_volume_l <= 0 OR p_engine_volume_l > 999.9
       OR p_engine_volume_l IS DISTINCT FROM trunc(p_engine_volume_l, 1)
     )
     OR p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$'
     OR p_price_negotiable IS NULL
     OR p_city IS NULL OR char_length(btrim(p_city)) = 0 THEN
    RAISE EXCEPTION 'invalid editable fields' USING ERRCODE = 'OT422';
  END IF;
  IF (p_fuel_type = 'electric' AND p_engine_volume_l IS NOT NULL)
     OR (p_fuel_type <> 'electric' AND p_engine_volume_l IS NULL) THEN
    RAISE EXCEPTION 'invalid engine displacement' USING ERRCODE = 'OT422';
  END IF;

  -- Deterministic order: listing, vehicle profile, then its current ownership row.
  SELECT l.id, l.vehicle_profile_id, l.seller_id, l.status, l.moderation_status,
         l.archived_at, l.updated_at, l.title, l.title_generated
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
  IF v_listing.updated_at IS DISTINCT FROM p_expected_listing_updated_at THEN
    RAISE EXCEPTION 'listing changed during editing' USING ERRCODE = 'OT409';
  END IF;

  SELECT vp.id, vp.make_id, vp.model_id, vp.year, vp.updated_at
  INTO v_vehicle
  FROM vehicle.vehicle_profiles AS vp
  WHERE vp.id = v_listing.vehicle_profile_id
    AND vp.created_by = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;
  IF v_vehicle.updated_at IS DISTINCT FROM p_expected_vehicle_updated_at THEN
    RAISE EXCEPTION 'vehicle changed during editing' USING ERRCODE = 'OT409';
  END IF;

  PERFORM 1
  FROM vehicle.profile_ownership AS po
  WHERE po.vehicle_profile_id = v_vehicle.id
    AND po.owner_id = v_user_id
    AND po.is_current = TRUE
    AND po.ended_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM vehicle.models AS m
    JOIN vehicle.makes AS mk ON mk.id = m.make_id
    WHERE m.id = p_model_id AND m.make_id = p_make_id
      AND m.is_active = TRUE AND mk.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'invalid make and model' USING ERRCODE = 'OT422';
  END IF;

  v_canonical_title := v_listing.title;
  IF v_listing.title_generated
     AND (v_vehicle.make_id IS DISTINCT FROM p_make_id
       OR v_vehicle.model_id IS DISTINCT FROM p_model_id
       OR v_vehicle.year IS DISTINCT FROM p_year) THEN
    SELECT concat_ws(' ', mk.name, m.name, p_year::TEXT)
    INTO v_canonical_title
    FROM vehicle.makes AS mk
    JOIN vehicle.models AS m ON m.make_id = mk.id
    WHERE mk.id = p_make_id AND m.id = p_model_id;
  END IF;

  UPDATE vehicle.vehicle_profiles AS vp
  SET make_id = p_make_id, model_id = p_model_id, year = p_year,
      mileage_km = p_mileage_km, condition = p_condition,
      fuel_type = p_fuel_type, transmission = p_transmission,
      body_type = p_body_type, drive_type = p_drive_type, color = p_color,
      engine_volume_l = p_engine_volume_l, damage_state = p_damage_state,
      owner_count = p_owner_count
  WHERE vp.id = v_vehicle.id
  RETURNING vp.updated_at INTO v_vehicle_updated_at;

  UPDATE marketplace.listings AS l
  SET title = v_canonical_title, description = p_description,
      price_amount = v_price_amount, currency = p_currency,
      price_negotiable = p_price_negotiable, city = p_city
  WHERE l.id = p_listing_id
    AND l.status IN ('draft', 'removed')
    AND l.moderation_status = 'rejected'
    AND l.archived_at IS NULL
  RETURNING l.updated_at INTO v_listing_updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing changed during editing' USING ERRCODE = 'OT409';
  END IF;

  RETURN QUERY SELECT
    p_listing_id, v_listing_updated_at, v_vehicle_updated_at,
    v_listing.status::TEXT, v_listing.moderation_status::TEXT,
    v_canonical_title, v_listing.title_generated;
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) FROM service_role;
REVOKE ALL ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.save_own_rejected_listing(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_own_rejected_listing(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.save_own_rejected_listing(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM service_role;
REVOKE ALL ON FUNCTION public.save_own_rejected_listing(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.save_own_rejected_listing(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) IS
  'SELL-03 owner-only canonical rejected listing, vehicle and canonically ordered media loader.';
COMMENT ON FUNCTION public.save_own_rejected_listing(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) IS
  'SELL-03 narrow atomic rejected-content save with listing, vehicle and ownership locking.';

NOTIFY pgrst, 'reload schema';
COMMIT;
