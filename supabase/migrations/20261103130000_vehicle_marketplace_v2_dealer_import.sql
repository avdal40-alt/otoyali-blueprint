BEGIN;

-- Extend, rather than replace, the established dealer-scoped reconciliation
-- boundary. Missing V2 fields intentionally retain the historical passenger
-- sale contract. This migration is local-only until the V2 runtime matrix.
CREATE OR REPLACE FUNCTION public.apply_own_verified_galeri_excel_import(p_source_sha256 TEXT, p_rows JSONB)
RETURNS TABLE (row_number INTEGER, status marketplace.dealer_import_row_status, external_listing_id TEXT, error_code TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketplace, vehicle, pg_catalog AS $$
DECLARE
  v_dealer_id UUID := auth.uid(); v_batch_id UUID; v_row JSONB; v_n INTEGER := 0;
  v_operation marketplace.dealer_import_operation; v_external TEXT; v_error TEXT; v_row_id UUID;
  v_category marketplace.vehicle_category; v_purpose marketplace.listing_purpose;
  v_make_slug TEXT; v_model_slug TEXT; v_title TEXT; v_description TEXT; v_city TEXT;
  v_year SMALLINT; v_mileage INTEGER; v_price BIGINT; v_day BIGINT; v_month BIGINT; v_deposit BIGINT;
  v_fuel vehicle.fuel_type; v_transmission vehicle.transmission_type; v_engine NUMERIC;
  v_minimum_days INTEGER; v_payload INTEGER; v_gross INTEGER; v_axles SMALLINT; v_seats SMALLINT; v_hours INTEGER; v_with_driver BOOLEAN;
  v_truck_body_type TEXT; v_bus_type TEXT; v_trailer_type TEXT; v_machinery_type TEXT;
  v_make_id UUID; v_model_id UUID; v_city_id UUID; v_listing_id UUID; v_vehicle_id UUID;
  v_existing_city_id UUID; v_existing_currency CHAR(3);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403'; END IF;
  IF NOT public.is_verified_galeri(v_dealer_id) THEN RAISE EXCEPTION 'verified Galeri required' USING ERRCODE = 'OT403'; END IF;
  IF p_source_sha256 !~ '^[0-9a-f]{64}$' OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'invalid import request' USING ERRCODE = 'OT422'; END IF;
  INSERT INTO marketplace.dealer_import_batches(dealer_id,source_sha256,status) VALUES(v_dealer_id,p_source_sha256,'applying') RETURNING id INTO v_batch_id;
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    v_n := v_n + 1; v_external := NULLIF(btrim(v_row->>'external_listing_id'),''); v_error := NULL; v_listing_id := NULL; v_city_id := NULL;
    BEGIN v_operation := COALESCE(NULLIF(btrim(v_row->>'operation'),''),'upsert')::marketplace.dealer_import_operation; EXCEPTION WHEN invalid_text_representation THEN v_error := 'invalid_operation'; END;
    IF jsonb_typeof(v_row) <> 'object' OR v_external IS NULL OR char_length(v_external) > 128 THEN v_error := 'invalid_external_listing_id'; END IF;
    IF v_error IS NULL AND v_operation = 'archive' THEN
      SELECT dlei.listing_id INTO v_listing_id FROM marketplace.dealer_listing_external_ids dlei WHERE dlei.dealer_id=v_dealer_id AND dlei.source='excel' AND dlei.external_listing_id=v_external FOR UPDATE;
      IF NOT FOUND THEN v_error := 'listing_not_found'; END IF;
    ELSIF v_error IS NULL THEN
      v_make_slug:=NULLIF(btrim(v_row->>'make_slug'),''); v_model_slug:=NULLIF(btrim(v_row->>'model_slug'),''); v_title:=NULLIF(btrim(v_row->>'title'),''); v_city:=NULLIF(btrim(v_row->>'city'),''); v_description:=NULLIF(btrim(v_row->>'description'),'');
      v_truck_body_type:=NULLIF(btrim(v_row->>'truck_body_type'),''); v_bus_type:=NULLIF(btrim(v_row->>'bus_type'),''); v_trailer_type:=NULLIF(btrim(v_row->>'trailer_type'),''); v_machinery_type:=NULLIF(btrim(v_row->>'machinery_type'),'');
      BEGIN
        v_category:=CASE WHEN v_row ? 'vehicle_category' THEN NULLIF(btrim(v_row->>'vehicle_category'),'')::marketplace.vehicle_category ELSE 'passenger_car'::marketplace.vehicle_category END;
      EXCEPTION WHEN invalid_text_representation THEN v_error:='invalid_vehicle_category'; END;
      IF v_error IS NULL AND v_row ? 'vehicle_category' AND v_category IS NULL THEN v_error:='invalid_vehicle_category'; END IF;
      BEGIN
        v_purpose:=CASE WHEN v_row ? 'listing_purpose' THEN NULLIF(btrim(v_row->>'listing_purpose'),'')::marketplace.listing_purpose ELSE 'sale'::marketplace.listing_purpose END;
      EXCEPTION WHEN invalid_text_representation THEN v_error:=COALESCE(v_error,'invalid_listing_purpose'); END;
      IF v_error IS NULL AND v_row ? 'listing_purpose' AND v_purpose IS NULL THEN v_error:='invalid_listing_purpose'; END IF;
      BEGIN
        v_year:=NULLIF(btrim(v_row->>'year'),'')::smallint; v_mileage:=NULLIF(btrim(v_row->>'mileage_km'),'')::integer; v_price:=NULLIF(btrim(v_row->>'price_amount'),'')::bigint;
        v_day:=NULLIF(btrim(v_row->>'rental_price_per_day'),'')::bigint; v_month:=NULLIF(btrim(v_row->>'rental_price_per_month'),'')::bigint; v_deposit:=NULLIF(btrim(v_row->>'security_deposit_amount'),'')::bigint;
        v_minimum_days:=NULLIF(btrim(v_row->>'minimum_rental_days'),'')::integer; v_payload:=NULLIF(btrim(v_row->>'payload_capacity_kg'),'')::integer; v_gross:=NULLIF(btrim(v_row->>'gross_weight_kg'),'')::integer;
        v_axles:=NULLIF(btrim(v_row->>'axle_count'),'')::smallint; v_seats:=NULLIF(btrim(v_row->>'seat_count'),'')::smallint; v_hours:=NULLIF(btrim(v_row->>'operating_hours'),'')::integer;
        v_engine:=NULLIF(btrim(v_row->>'engine_volume_l'),'')::numeric; v_fuel:=NULLIF(btrim(v_row->>'fuel_type'),'')::vehicle.fuel_type; v_transmission:=NULLIF(btrim(v_row->>'transmission'),'')::vehicle.transmission_type;
        v_with_driver:=CASE WHEN NULLIF(btrim(v_row->>'with_driver_or_operator'),'') IS NULL THEN NULL WHEN lower(btrim(v_row->>'with_driver_or_operator'))='true' THEN TRUE WHEN lower(btrim(v_row->>'with_driver_or_operator'))='false' THEN FALSE ELSE NULL END;
      EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN v_error:=COALESCE(v_error,'invalid_v2_field_value'); END;
      IF v_error IS NULL AND v_row ? 'with_driver_or_operator' AND NULLIF(btrim(v_row->>'with_driver_or_operator'),'') IS NOT NULL AND lower(btrim(v_row->>'with_driver_or_operator')) NOT IN ('true','false') THEN v_error:='invalid_with_driver_or_operator'; END IF;
      IF v_error IS NULL AND (v_title IS NULL OR v_city IS NULL OR char_length(v_title)>160 OR char_length(v_city)>120 OR (v_description IS NOT NULL AND char_length(v_description)>8000) OR v_year NOT BETWEEN 1900 AND EXTRACT(YEAR FROM NOW())::integer+1) THEN v_error:='missing_or_invalid_required_field'; END IF;
      IF v_error IS NULL AND v_category='passenger_car' AND (v_make_slug IS NULL OR v_model_slug IS NULL OR v_mileage IS NULL OR v_mileage<0 OR v_fuel IS NULL OR v_transmission IS NULL) THEN v_error:='passenger_car_details_required'; END IF;
      IF v_error IS NULL AND v_category<>'passenger_car' AND ((v_make_slug IS NULL) <> (v_model_slug IS NULL)) THEN v_error:='make_model_pair_required'; END IF;
      IF v_error IS NULL AND v_mileage IS NOT NULL AND v_mileage<0 THEN v_error:='invalid_mileage_km'; END IF;
      IF v_error IS NULL AND v_category='trailer' AND (v_mileage IS NOT NULL OR v_fuel IS NOT NULL OR v_transmission IS NOT NULL OR v_engine IS NOT NULL) THEN v_error:='trailer_engine_mileage_fields_not_allowed'; END IF;
      IF v_error IS NULL AND (v_engine IS NOT NULL AND (v_engine<=0 OR v_engine>999.9)) THEN v_error:='invalid_engine_volume_l'; END IF;
      IF v_error IS NULL AND (v_truck_body_type IS NOT NULL AND (v_category<>'truck' OR char_length(v_truck_body_type)>80)) THEN v_error:='truck_details_not_valid_for_category'; END IF;
      IF v_error IS NULL AND (v_bus_type IS NOT NULL AND (v_category<>'bus' OR v_bus_type NOT IN ('minibus','city','intercity','tourist','other'))) THEN v_error:='bus_details_not_valid_for_category'; END IF;
      IF v_error IS NULL AND (v_trailer_type IS NOT NULL AND (v_category<>'trailer' OR char_length(v_trailer_type)>80)) THEN v_error:='trailer_details_not_valid_for_category'; END IF;
      IF v_error IS NULL AND (v_machinery_type IS NOT NULL AND (v_category<>'special_machinery' OR char_length(v_machinery_type)>80)) THEN v_error:='machinery_details_not_valid_for_category'; END IF;
      IF v_error IS NULL AND v_category<>'bus' AND v_seats IS NOT NULL THEN v_error:='bus_details_not_valid_for_category'; END IF;
      IF v_error IS NULL AND v_category NOT IN ('truck','trailer') AND (v_payload IS NOT NULL OR v_gross IS NOT NULL OR v_axles IS NOT NULL) THEN v_error:='commercial_capacity_details_not_valid_for_category'; END IF;
      IF v_error IS NULL AND ((v_payload IS NOT NULL AND v_payload<=0) OR (v_gross IS NOT NULL AND v_gross<=0) OR (v_axles IS NOT NULL AND v_axles NOT BETWEEN 1 AND 16) OR (v_seats IS NOT NULL AND v_seats NOT BETWEEN 1 AND 200) OR (v_hours IS NOT NULL AND (v_category<>'special_machinery' OR v_hours<0))) THEN v_error:='invalid_category_detail_value'; END IF;
      IF v_error IS NULL AND v_purpose='sale' AND (v_price IS NULL OR v_price<=0 OR v_day IS NOT NULL OR v_month IS NOT NULL OR v_minimum_days IS NOT NULL OR v_deposit IS NOT NULL OR v_with_driver IS NOT NULL) THEN v_error:='invalid_sale_price_contract'; END IF;
      IF v_error IS NULL AND v_purpose='rent' AND (v_price IS NOT NULL OR v_day IS NULL OR v_day<=0 OR (v_month IS NOT NULL AND v_month<=0) OR (v_minimum_days IS NOT NULL AND v_minimum_days<=0) OR (v_deposit IS NOT NULL AND v_deposit<0)) THEN v_error:='invalid_rental_price_contract'; END IF;
      IF v_error IS NULL AND v_make_slug IS NOT NULL THEN SELECT ma.id,mo.id INTO v_make_id,v_model_id FROM vehicle.makes ma JOIN vehicle.models mo ON mo.make_id=ma.id WHERE ma.slug=v_make_slug AND mo.slug=v_model_slug AND ma.is_active AND mo.is_active; IF NOT FOUND THEN v_error:='unknown_vehicle_catalog'; END IF; END IF;
      IF v_error IS NULL THEN SELECT id INTO v_city_id FROM marketplace.cities WHERE country_code='KZ' AND is_active AND lower(name)=lower(v_city) ORDER BY sort_order,id LIMIT 1; IF NOT FOUND THEN v_error:='unknown_kazakhstan_city'; END IF; END IF;
    END IF;
    INSERT INTO marketplace.dealer_import_rows(batch_id,row_number,operation,external_listing_id,status) VALUES(v_batch_id,v_n,COALESCE(v_operation,'upsert'),v_external,(CASE WHEN v_error IS NULL THEN 'valid' ELSE 'invalid' END)::marketplace.dealer_import_row_status) RETURNING id INTO v_row_id;
    IF v_error IS NOT NULL THEN INSERT INTO marketplace.dealer_import_issues(import_row_id,error_code) VALUES(v_row_id,v_error); row_number:=v_n;status:='invalid';external_listing_id:=v_external;error_code:=v_error;RETURN NEXT;CONTINUE; END IF;
    IF v_operation='archive' THEN UPDATE marketplace.listings SET status='removed',moderation_status='archived',archived_at=now() WHERE id=v_listing_id AND seller_id=v_dealer_id; UPDATE marketplace.dealer_listing_external_ids SET last_seen_batch_id=v_batch_id WHERE dealer_id=v_dealer_id AND source='excel' AND external_listing_id=v_external; UPDATE marketplace.dealer_import_rows SET status='archived',listing_id=v_listing_id WHERE id=v_row_id; row_number:=v_n;status:='archived';external_listing_id:=v_external;error_code:=NULL;RETURN NEXT;CONTINUE; END IF;
    SELECT dlei.listing_id INTO v_listing_id FROM marketplace.dealer_listing_external_ids dlei WHERE dlei.dealer_id=v_dealer_id AND dlei.source='excel' AND dlei.external_listing_id=v_external FOR UPDATE;
    IF FOUND THEN
      SELECT city_id,currency INTO v_existing_city_id,v_existing_currency FROM marketplace.listings WHERE id=v_listing_id AND seller_id=v_dealer_id FOR UPDATE;
      IF NOT FOUND OR NOT marketplace.is_jolmod_kazakhstan_city(v_existing_city_id) OR v_existing_currency IS DISTINCT FROM 'KZT'::CHAR(3) THEN INSERT INTO marketplace.dealer_import_issues(import_row_id,error_code) VALUES(v_row_id,'listing_market_mismatch'); UPDATE marketplace.dealer_import_rows SET status='invalid' WHERE id=v_row_id; row_number:=v_n;status:='invalid';external_listing_id:=v_external;error_code:='listing_market_mismatch';RETURN NEXT;CONTINUE; END IF;
      UPDATE vehicle.vehicle_profiles SET make_id=v_make_id,model_id=v_model_id,year=v_year,mileage_km=v_mileage,fuel_type=v_fuel,transmission=v_transmission,engine_volume_l=v_engine WHERE id=(SELECT vehicle_profile_id FROM marketplace.listings WHERE id=v_listing_id AND seller_id=v_dealer_id);
      UPDATE marketplace.listings SET title=v_title,description=v_description,price_amount=CASE WHEN v_purpose='sale' THEN v_price ELSE NULL END,currency='KZT',city=v_city,city_id=v_city_id,status='draft',moderation_status='pending_review',published_at=NULL,moderated_by=NULL,moderated_at=NULL,archived_at=NULL,rejection_reason=NULL,moderation_note=NULL,vehicle_category=v_category,listing_purpose=v_purpose,rental_price_per_day=CASE WHEN v_purpose='rent' THEN v_day ELSE NULL END,rental_price_per_month=CASE WHEN v_purpose='rent' THEN v_month ELSE NULL END,minimum_rental_days=CASE WHEN v_purpose='rent' THEN v_minimum_days ELSE NULL END,security_deposit_amount=CASE WHEN v_purpose='rent' THEN v_deposit ELSE NULL END,with_driver_or_operator=CASE WHEN v_purpose='rent' THEN v_with_driver ELSE NULL END WHERE id=v_listing_id AND seller_id=v_dealer_id;
      INSERT INTO marketplace.listing_vehicle_category_details(listing_id,truck_body_type,bus_type,trailer_type,machinery_type,payload_capacity_kg,gross_weight_kg,axle_count,seat_count,operating_hours) VALUES(v_listing_id,v_truck_body_type,v_bus_type,v_trailer_type,v_machinery_type,v_payload,v_gross,v_axles,v_seats,v_hours) ON CONFLICT (listing_id) DO UPDATE SET truck_body_type=EXCLUDED.truck_body_type,bus_type=EXCLUDED.bus_type,trailer_type=EXCLUDED.trailer_type,machinery_type=EXCLUDED.machinery_type,payload_capacity_kg=EXCLUDED.payload_capacity_kg,gross_weight_kg=EXCLUDED.gross_weight_kg,axle_count=EXCLUDED.axle_count,seat_count=EXCLUDED.seat_count,operating_hours=EXCLUDED.operating_hours;
      UPDATE marketplace.dealer_listing_external_ids SET last_seen_batch_id=v_batch_id WHERE dealer_id=v_dealer_id AND source='excel' AND external_listing_id=v_external;
    ELSE
      INSERT INTO vehicle.vehicle_profiles(make_id,model_id,year,mileage_km,fuel_type,transmission,engine_volume_l,created_by) VALUES(v_make_id,v_model_id,v_year,v_mileage,v_fuel,v_transmission,v_engine,v_dealer_id) RETURNING id INTO v_vehicle_id;
      INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id) VALUES(v_vehicle_id,v_dealer_id);
      INSERT INTO marketplace.listings(vehicle_profile_id,seller_id,seller_type,status,moderation_status,title,description,price_amount,currency,city,city_id,vehicle_category,listing_purpose,rental_price_per_day,rental_price_per_month,minimum_rental_days,security_deposit_amount,with_driver_or_operator) VALUES(v_vehicle_id,v_dealer_id,'dealer','draft','pending_review',v_title,v_description,CASE WHEN v_purpose='sale' THEN v_price ELSE NULL END,'KZT',v_city,v_city_id,v_category,v_purpose,CASE WHEN v_purpose='rent' THEN v_day ELSE NULL END,CASE WHEN v_purpose='rent' THEN v_month ELSE NULL END,CASE WHEN v_purpose='rent' THEN v_minimum_days ELSE NULL END,CASE WHEN v_purpose='rent' THEN v_deposit ELSE NULL END,CASE WHEN v_purpose='rent' THEN v_with_driver ELSE NULL END) RETURNING id INTO v_listing_id;
      INSERT INTO marketplace.listing_vehicle_category_details(listing_id,truck_body_type,bus_type,trailer_type,machinery_type,payload_capacity_kg,gross_weight_kg,axle_count,seat_count,operating_hours) VALUES(v_listing_id,v_truck_body_type,v_bus_type,v_trailer_type,v_machinery_type,v_payload,v_gross,v_axles,v_seats,v_hours);
      INSERT INTO marketplace.dealer_listing_external_ids(dealer_id,external_listing_id,listing_id,last_seen_batch_id) VALUES(v_dealer_id,v_external,v_listing_id,v_batch_id);
    END IF;
    UPDATE marketplace.dealer_import_rows SET status='applied',listing_id=v_listing_id WHERE id=v_row_id; row_number:=v_n;status:='applied';external_listing_id:=v_external;error_code:=NULL;RETURN NEXT;
  END LOOP;
  UPDATE marketplace.dealer_import_batches SET status='completed',completed_at=now() WHERE id=v_batch_id;
END; $$;

REVOKE ALL ON FUNCTION public.apply_own_verified_galeri_excel_import(TEXT,JSONB) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.apply_own_verified_galeri_excel_import(TEXT,JSONB) TO authenticated;
COMMENT ON FUNCTION public.apply_own_verified_galeri_excel_import(TEXT,JSONB) IS 'Verified dealer import with dealer-scoped external identity, KZ/KZT binding, and Vehicle Marketplace V2 category and rental contracts.';
NOTIFY pgrst, 'reload schema';
COMMIT;
