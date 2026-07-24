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
  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  SELECT jsonb_build_object(
    'listing', jsonb_build_object(
      'id', l.id, 'title', l.title, 'description', l.description,
      'price_amount', l.price_amount, 'currency', l.currency,
      'price_negotiable', l.price_negotiable, 'city', l.city,
      'seller_type', l.seller_type, 'updated_at', l.updated_at,
      'vehicle_profile_id', l.vehicle_profile_id
    ),
    'vehicle', jsonb_build_object(
      'make_id', vp.make_id, 'model_id', vp.model_id, 'year', vp.year,
      'mileage_km', vp.mileage_km, 'condition', vp.condition,
      'fuel_type', vp.fuel_type, 'transmission', vp.transmission,
      'body_type', vp.body_type, 'drive_type', vp.drive_type, 'color', vp.color,
      'engine_volume_l', vp.engine_volume_l, 'damage_state', vp.damage_state,
      'owner_count', vp.owner_count
    ),
    'media', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pm.id, 'url', pm.url, 'thumb_url', pm.thumb_url,
        'card_url', pm.card_url, 'large_url', pm.large_url,
        'is_cover', pm.is_cover, 'sort_order', pm.sort_order
      ) ORDER BY (pm.id = l.cover_media_id) DESC, pm.is_cover DESC, pm.sort_order, pm.created_at)
      FROM vehicle.profile_media pm
      WHERE pm.vehicle_profile_id = l.vehicle_profile_id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM marketplace.listings l
  JOIN vehicle.vehicle_profiles vp ON vp.id = l.vehicle_profile_id
  WHERE l.id = p_listing_id
    AND l.seller_id = v_user_id
    AND vp.created_by = v_user_id
    AND vehicle.is_current_profile_owner(vp.id, v_user_id)
    AND l.status = 'draft'
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
  p_expected_updated_at TIMESTAMPTZ,
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
  p_title TEXT,
  p_description TEXT,
  p_price_amount BIGINT,
  p_currency TEXT,
  p_price_negotiable BOOLEAN,
  p_city TEXT,
  p_seller_type TEXT,
  p_seller_display_name TEXT,
  p_quality_score SMALLINT
)
RETURNS TABLE (listing_id UUID, updated_at TIMESTAMPTZ, status TEXT, moderation_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing RECORD;
  v_updated_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF p_listing_id IS NULL OR p_expected_updated_at IS NULL THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;
  IF p_fuel_type <> 'electric' AND (p_engine_volume_l IS NULL OR p_engine_volume_l <= 0) THEN
    RAISE EXCEPTION 'engine displacement is required for combustion and hybrid vehicles' USING ERRCODE = 'OT422';
  END IF;
  IF p_fuel_type = 'electric' AND p_engine_volume_l IS NOT NULL THEN
    RAISE EXCEPTION 'engine displacement must be empty for electric vehicles' USING ERRCODE = 'OT422';
  END IF;

  SELECT l.id, l.vehicle_profile_id, l.seller_id, l.status, l.moderation_status,
         l.archived_at, l.updated_at
  INTO v_listing
  FROM marketplace.listings l
  WHERE l.id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND OR v_listing.seller_id <> v_user_id THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;
  IF v_listing.status <> 'draft' OR v_listing.moderation_status <> 'rejected'
     OR v_listing.archived_at IS NOT NULL
     OR NOT vehicle.is_current_profile_owner(v_listing.vehicle_profile_id, v_user_id) THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;
  IF v_listing.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'listing changed during editing' USING ERRCODE = 'OT409';
  END IF;

  PERFORM 1 FROM vehicle.vehicle_profiles vp
  WHERE vp.id = v_listing.vehicle_profile_id AND vp.created_by = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  UPDATE vehicle.vehicle_profiles
  SET make_id = p_make_id, model_id = p_model_id, year = p_year,
      mileage_km = p_mileage_km, condition = p_condition,
      fuel_type = p_fuel_type, transmission = p_transmission,
      body_type = NULLIF(trim(p_body_type), ''), drive_type = NULLIF(trim(p_drive_type), ''),
      color = NULLIF(trim(p_color), ''), engine_volume_l = p_engine_volume_l,
      damage_state = NULLIF(trim(p_damage_state), ''), owner_count = p_owner_count
  WHERE id = v_listing.vehicle_profile_id;

  UPDATE marketplace.listings
  SET title = trim(p_title), title_generated = TRUE,
      description = NULLIF(trim(p_description), ''), price_amount = p_price_amount,
      currency = upper(p_currency), price_negotiable = p_price_negotiable,
      city = trim(p_city), seller_type = p_seller_type,
      seller_display_name = NULLIF(trim(p_seller_display_name), ''),
      quality_score = p_quality_score
  WHERE id = p_listing_id
    AND status = 'draft' AND moderation_status = 'rejected' AND archived_at IS NULL
  RETURNING marketplace.listings.updated_at INTO v_updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing changed during editing' USING ERRCODE = 'OT409';
  END IF;
  RETURN QUERY SELECT p_listing_id, v_updated_at, 'draft'::TEXT, 'rejected'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.save_own_rejected_listing(UUID, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, BIGINT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, SMALLINT) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.save_own_rejected_listing(UUID, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, BIGINT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, SMALLINT) TO authenticated;

COMMENT ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) IS
  'SELL-03 owner-only canonical rejected listing, vehicle and media loader. Ineligible and foreign rows are indistinguishable.';
COMMENT ON FUNCTION public.save_own_rejected_listing(UUID, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, BIGINT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, SMALLINT) IS
  'SELL-03 narrow atomic rejected-content save. Identity, relationship, media and lifecycle fields are immutable.';

NOTIFY pgrst, 'reload schema';
COMMIT;
