BEGIN;

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

REVOKE ALL ON FUNCTION public.create_own_listing_draft(UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_own_listing_draft(UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
