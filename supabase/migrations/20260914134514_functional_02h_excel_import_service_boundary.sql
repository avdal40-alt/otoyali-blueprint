BEGIN;

-- FUNCTIONAL-02H: the workbook is parsed only by the application server. This
-- function receives a bounded, normalized row contract and is the sole
-- authenticated write path over the private FUNCTIONAL-02F bookkeeping.
CREATE OR REPLACE FUNCTION public.apply_own_verified_galeri_excel_import(
  p_source_sha256 TEXT,
  p_rows JSONB
)
RETURNS TABLE (
  row_number INTEGER,
  status marketplace.dealer_import_row_status,
  external_listing_id TEXT,
  error_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketplace, vehicle, pg_catalog
AS $$
DECLARE
  v_dealer_id UUID := auth.uid();
  v_batch_id UUID;
  v_row JSONB;
  v_row_number INTEGER := 0;
  v_operation marketplace.dealer_import_operation;
  v_external_id TEXT;
  v_make_slug TEXT;
  v_model_slug TEXT;
  v_title TEXT;
  v_description TEXT;
  v_city TEXT;
  v_year SMALLINT;
  v_mileage INTEGER;
  v_price BIGINT;
  v_fuel vehicle.fuel_type;
  v_transmission vehicle.transmission_type;
  v_make_id UUID;
  v_model_id UUID;
  v_listing_id UUID;
  v_profile_id UUID;
  v_error TEXT;
BEGIN
  IF v_dealer_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF NOT public.is_verified_galeri(v_dealer_id) THEN
    RAISE EXCEPTION 'verified Galeri required' USING ERRCODE = 'OT403';
  END IF;
  IF p_source_sha256 !~ '^[0-9a-f]{64}$' OR jsonb_typeof(p_rows) <> 'array'
     OR jsonb_array_length(p_rows) = 0 OR jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'invalid import request' USING ERRCODE = 'OT422';
  END IF;

  INSERT INTO marketplace.dealer_import_batches (dealer_id, source_sha256, status)
  VALUES (v_dealer_id, p_source_sha256, 'applying') RETURNING id INTO v_batch_id;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    v_row_number := v_row_number + 1;
    v_external_id := NULLIF(btrim(v_row ->> 'external_listing_id'), '');
    v_operation := COALESCE(NULLIF(btrim(v_row ->> 'operation'), ''), 'upsert')::marketplace.dealer_import_operation;
    v_error := NULL;
    IF jsonb_typeof(v_row) <> 'object' OR v_external_id IS NULL OR char_length(v_external_id) > 128 THEN
      v_error := 'invalid_external_listing_id';
    END IF;
    IF v_error IS NULL AND v_operation = 'archive' THEN
      SELECT listing_id INTO v_listing_id FROM marketplace.dealer_listing_external_ids
      WHERE dealer_id = v_dealer_id AND source = 'excel' AND external_listing_id = v_external_id FOR UPDATE;
      IF NOT FOUND THEN v_error := 'listing_not_found'; END IF;
    ELSIF v_error IS NULL THEN
      v_make_slug := NULLIF(btrim(v_row ->> 'make_slug'), ''); v_model_slug := NULLIF(btrim(v_row ->> 'model_slug'), '');
      v_title := NULLIF(btrim(v_row ->> 'title'), ''); v_city := NULLIF(btrim(v_row ->> 'city'), '');
      v_description := NULLIF(btrim(v_row ->> 'description'), '');
      BEGIN
        v_year := (v_row ->> 'year')::SMALLINT; v_mileage := (v_row ->> 'mileage_km')::INTEGER;
        v_price := (v_row ->> 'price_amount')::BIGINT; v_fuel := (v_row ->> 'fuel_type')::vehicle.fuel_type;
        v_transmission := (v_row ->> 'transmission')::vehicle.transmission_type;
      EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        v_error := 'invalid_vehicle_value';
      END;
      IF v_error IS NULL AND (v_make_slug IS NULL OR v_model_slug IS NULL OR v_title IS NULL OR v_city IS NULL
          OR char_length(v_title) > 160 OR char_length(v_city) > 120 OR (v_description IS NOT NULL AND char_length(v_description) > 8000)
          OR v_year NOT BETWEEN 1900 AND EXTRACT(YEAR FROM NOW())::INTEGER + 1 OR v_mileage < 0 OR v_price <= 0) THEN
        v_error := 'missing_or_invalid_required_field';
      END IF;
      IF v_error IS NULL THEN
        SELECT ma.id, mo.id INTO v_make_id, v_model_id FROM vehicle.makes ma JOIN vehicle.models mo ON mo.make_id = ma.id
        WHERE ma.slug = v_make_slug AND mo.slug = v_model_slug AND ma.is_active AND mo.is_active;
        IF NOT FOUND THEN v_error := 'unknown_vehicle_catalog'; END IF;
      END IF;
    END IF;

    INSERT INTO marketplace.dealer_import_rows (batch_id, row_number, operation, external_listing_id, status)
    VALUES (v_batch_id, v_row_number, v_operation, v_external_id, CASE WHEN v_error IS NULL THEN 'valid' ELSE 'invalid' END)
    RETURNING id INTO v_profile_id;
    IF v_error IS NOT NULL THEN
      INSERT INTO marketplace.dealer_import_issues (import_row_id, error_code) VALUES (v_profile_id, v_error);
      row_number := v_row_number; status := 'invalid'; external_listing_id := v_external_id; error_code := v_error; RETURN NEXT; CONTINUE;
    END IF;

    IF v_operation = 'archive' THEN
      UPDATE marketplace.listings SET status = 'archived', archived_at = NOW() WHERE id = v_listing_id AND seller_id = v_dealer_id;
      UPDATE marketplace.dealer_import_rows SET status = 'archived', listing_id = v_listing_id WHERE id = v_profile_id;
      row_number := v_row_number; status := 'archived'; external_listing_id := v_external_id; error_code := NULL; RETURN NEXT; CONTINUE;
    END IF;

    SELECT listing_id INTO v_listing_id FROM marketplace.dealer_listing_external_ids
    WHERE dealer_id = v_dealer_id AND source = 'excel' AND external_listing_id = v_external_id FOR UPDATE;
    IF FOUND THEN
      UPDATE marketplace.listings SET title = v_title, description = v_description, price_amount = v_price, city = v_city,
        status = 'draft', moderation_status = 'pending_review', published_at = NULL, moderated_by = NULL, moderated_at = NULL,
        archived_at = NULL, rejection_reason = NULL, moderation_note = NULL
      WHERE id = v_listing_id AND seller_id = v_dealer_id;
    ELSE
      INSERT INTO vehicle.vehicle_profiles (make_id, model_id, year, mileage_km, fuel_type, transmission, created_by)
      VALUES (v_make_id, v_model_id, v_year, v_mileage, v_fuel, v_transmission, v_dealer_id) RETURNING id INTO v_profile_id;
      INSERT INTO vehicle.profile_ownership (vehicle_profile_id, owner_id) VALUES (v_profile_id, v_dealer_id);
      INSERT INTO marketplace.listings (vehicle_profile_id, seller_id, seller_type, status, moderation_status, title, description, price_amount, city)
      VALUES (v_profile_id, v_dealer_id, 'dealer', 'draft', 'pending_review', v_title, v_description, v_price, v_city) RETURNING id INTO v_listing_id;
      INSERT INTO marketplace.dealer_listing_external_ids (dealer_id, external_listing_id, listing_id, last_seen_batch_id)
      VALUES (v_dealer_id, v_external_id, v_listing_id, v_batch_id);
    END IF;
    UPDATE marketplace.dealer_import_rows SET status = 'applied', listing_id = v_listing_id WHERE id = (SELECT id FROM marketplace.dealer_import_rows WHERE batch_id = v_batch_id AND row_number = v_row_number);
    row_number := v_row_number; status := 'applied'; external_listing_id := v_external_id; error_code := NULL; RETURN NEXT;
  END LOOP;
  UPDATE marketplace.dealer_import_batches SET status = 'completed', completed_at = NOW() WHERE id = v_batch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_own_verified_galeri_excel_import(TEXT, JSONB) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.apply_own_verified_galeri_excel_import(TEXT, JSONB) TO authenticated;
COMMENT ON FUNCTION public.apply_own_verified_galeri_excel_import(TEXT, JSONB) IS
  'FUNCTIONAL-02H verified-Galeri-only Excel application boundary. It accepts bounded normalized rows, keeps F bookkeeping private, and forces imported listings through pending moderation.';
NOTIFY pgrst, 'reload schema';
COMMIT;
