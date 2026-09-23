BEGIN;

-- SELL-SEC-03A: additive canonical seller create/media contracts.  The legacy
-- browser DML paths remain intentionally available until SELL-SEC-03C.

CREATE FUNCTION public.create_own_listing_draft(
  p_make_id UUID,
  p_model_id UUID,
  p_variant_id UUID,
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
  p_city TEXT,
  p_city_id UUID DEFAULT NULL,
  p_district_id UUID DEFAULT NULL
)
RETURNS TABLE (listing_id UUID, vehicle_profile_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
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
$$;

CREATE FUNCTION public.attach_own_listing_media(
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
    IF (SELECT vehicle_profile_id FROM vehicle.profile_media WHERE id = p_media_id) <> v_vehicle_profile_id THEN
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
    UPDATE vehicle.profile_media
    SET is_cover = FALSE
    WHERE vehicle_profile_id = v_vehicle_profile_id AND is_cover = TRUE;
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

REVOKE ALL ON FUNCTION public.create_own_listing_draft(UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_own_listing_draft(UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.attach_own_listing_media(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, SMALLINT, BOOLEAN, INTEGER, INTEGER, NUMERIC, TEXT, BIGINT, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.attach_own_listing_media(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, SMALLINT, BOOLEAN, INTEGER, INTEGER, NUMERIC, TEXT, BIGINT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.create_own_listing_draft(UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID) IS
  'SELL-SEC-03A atomic owner-derived vehicle profile, ownership, and draft listing create contract. Durable idempotency is deliberately deferred to the 03B server mutation boundary.';
COMMENT ON FUNCTION public.attach_own_listing_media(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, SMALLINT, BOOLEAN, INTEGER, INTEGER, NUMERIC, TEXT, BIGINT, TEXT) IS
  'SELL-SEC-03A owner-only draft media association. Canonical object paths are validated against storage ownership and profile/media namespace; paths are never returned.';

NOTIFY pgrst, 'reload schema';

COMMIT;
