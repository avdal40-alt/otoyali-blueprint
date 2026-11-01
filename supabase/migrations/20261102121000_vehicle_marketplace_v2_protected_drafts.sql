BEGIN;

-- Non-passenger vehicles can lack an engine and a make/model. Existing
-- passenger profiles remain valid; the trigger retains the all-or-nothing
-- catalog relationship when either catalog id is supplied.
ALTER TABLE vehicle.vehicle_profiles
  ALTER COLUMN make_id DROP NOT NULL,
  ALTER COLUMN model_id DROP NOT NULL,
  ALTER COLUMN mileage_km DROP NOT NULL,
  ALTER COLUMN fuel_type DROP NOT NULL,
  ALTER COLUMN transmission DROP NOT NULL;

-- The earlier zero-kilometre rule remains valid whenever mileage is known.
-- Trailers intentionally have no engine or mileage contract, so a NULL
-- mileage is not evidence that a "new" or "used" declaration is inconsistent.
ALTER TABLE vehicle.vehicle_profiles
  DROP CONSTRAINT vehicle_profiles_condition_mileage_chk;

ALTER TABLE vehicle.vehicle_profiles
  ADD CONSTRAINT vehicle_profiles_condition_mileage_chk
  CHECK (
    condition IS NULL
    OR mileage_km IS NULL
    OR (condition = 'new' AND mileage_km = 0)
    OR (condition = 'used' AND mileage_km > 0)
  );

CREATE OR REPLACE FUNCTION vehicle.validate_profile_model_make()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = vehicle, pg_catalog AS $$
BEGIN
  IF NEW.make_id IS NULL AND NEW.model_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.make_id IS NULL OR NEW.model_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM vehicle.models m WHERE m.id = NEW.model_id AND m.make_id = NEW.make_id AND m.is_active
  ) THEN RAISE EXCEPTION 'vehicle model does not belong to selected make'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_own_listing_draft_v3(
  p_vehicle_category marketplace.vehicle_category, p_listing_purpose marketplace.listing_purpose,
  p_make_id UUID, p_model_id UUID, p_variant_id UUID, p_year SMALLINT, p_mileage_km INTEGER,
  p_condition TEXT, p_fuel_type vehicle.fuel_type, p_transmission vehicle.transmission_type,
  p_body_type TEXT, p_drive_type TEXT, p_color TEXT, p_engine_volume_l NUMERIC,
  p_description TEXT, p_sale_price_amount_text TEXT, p_currency TEXT, p_price_negotiable BOOLEAN,
  p_city TEXT, p_seller_contact_phone_id UUID, p_city_id UUID, p_district_id UUID,
  p_rental_price_per_day_text TEXT DEFAULT NULL, p_rental_price_per_month_text TEXT DEFAULT NULL,
  p_minimum_rental_days INTEGER DEFAULT NULL, p_security_deposit_amount_text TEXT DEFAULT NULL,
  p_with_driver_or_operator BOOLEAN DEFAULT NULL, p_truck_body_type TEXT DEFAULT NULL,
  p_bus_type TEXT DEFAULT NULL, p_trailer_type TEXT DEFAULT NULL, p_machinery_type TEXT DEFAULT NULL,
  p_payload_capacity_kg INTEGER DEFAULT NULL, p_gross_weight_kg INTEGER DEFAULT NULL,
  p_axle_count SMALLINT DEFAULT NULL, p_seat_count SMALLINT DEFAULT NULL, p_operating_hours INTEGER DEFAULT NULL
) RETURNS TABLE(listing_id UUID, vehicle_profile_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketplace, vehicle, identity, pg_catalog AS $$
DECLARE v_user UUID := auth.uid(); v_profile UUID; v_listing UUID; v_created TIMESTAMPTZ; v_seller_type TEXT;
  v_sale BIGINT; v_day BIGINT; v_month BIGINT; v_deposit BIGINT; v_title TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='OT401'; END IF;
  IF public.is_admin(v_user) THEN RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE='OT403'; END IF;
  PERFORM identity.require_kazakhstan_seller_contact_phone(v_user,p_seller_contact_phone_id);
  IF p_vehicle_category IS NULL OR p_listing_purpose IS NULL OR p_year IS NULL OR p_year < 1900 OR p_year > EXTRACT(YEAR FROM now())::INT+1
    OR p_condition IS NULL OR p_condition NOT IN ('used','new') OR p_currency IS NULL OR p_currency <> 'KZT' OR p_city IS NULL OR char_length(btrim(p_city))=0
    OR (p_district_id IS NOT NULL AND p_city_id IS NULL) THEN RAISE EXCEPTION 'invalid listing create fields' USING ERRCODE='OT422'; END IF;
  IF p_vehicle_category='passenger_car' AND (p_make_id IS NULL OR p_model_id IS NULL OR p_mileage_km IS NULL OR p_fuel_type IS NULL OR p_transmission IS NULL) THEN RAISE EXCEPTION 'passenger car details required' USING ERRCODE='OT422'; END IF;
  IF p_vehicle_category='trailer' AND (p_mileage_km IS NOT NULL OR p_fuel_type IS NOT NULL OR p_transmission IS NOT NULL OR p_engine_volume_l IS NOT NULL) THEN RAISE EXCEPTION 'trailer cannot include engine or mileage fields' USING ERRCODE='OT422'; END IF;
  IF p_variant_id IS NOT NULL AND (p_model_id IS NULL OR NOT EXISTS(SELECT 1 FROM vehicle.variants v WHERE v.id=p_variant_id AND v.model_id=p_model_id AND v.is_active)) THEN RAISE EXCEPTION 'invalid vehicle variant' USING ERRCODE='OT422'; END IF;
  IF p_vehicle_category <> 'truck' AND p_truck_body_type IS NOT NULL THEN RAISE EXCEPTION 'truck details are not valid for this category' USING ERRCODE='OT422'; END IF;
  IF p_vehicle_category <> 'bus' AND (p_bus_type IS NOT NULL OR p_seat_count IS NOT NULL) THEN RAISE EXCEPTION 'bus details are not valid for this category' USING ERRCODE='OT422'; END IF;
  IF p_vehicle_category <> 'trailer' AND p_trailer_type IS NOT NULL THEN RAISE EXCEPTION 'trailer details are not valid for this category' USING ERRCODE='OT422'; END IF;
  IF p_vehicle_category <> 'special_machinery' AND (p_machinery_type IS NOT NULL OR p_operating_hours IS NOT NULL) THEN RAISE EXCEPTION 'machinery details are not valid for this category' USING ERRCODE='OT422'; END IF;
  IF p_vehicle_category NOT IN ('truck','trailer') AND (p_payload_capacity_kg IS NOT NULL OR p_gross_weight_kg IS NOT NULL OR p_axle_count IS NOT NULL) THEN RAISE EXCEPTION 'commercial capacity details are not valid for this category' USING ERRCODE='OT422'; END IF;
  IF p_listing_purpose='sale' THEN
    IF p_sale_price_amount_text IS NULL OR p_sale_price_amount_text !~ '^[1-9][0-9]{0,18}$' OR p_rental_price_per_day_text IS NOT NULL OR p_rental_price_per_month_text IS NOT NULL OR p_minimum_rental_days IS NOT NULL OR p_security_deposit_amount_text IS NOT NULL OR p_with_driver_or_operator IS NOT NULL THEN RAISE EXCEPTION 'invalid sale price contract' USING ERRCODE='OT422'; END IF;
    v_sale:=p_sale_price_amount_text::BIGINT;
  ELSE
    IF p_sale_price_amount_text IS NOT NULL OR p_rental_price_per_day_text IS NULL OR p_rental_price_per_day_text !~ '^[1-9][0-9]{0,18}$' OR (p_rental_price_per_month_text IS NOT NULL AND p_rental_price_per_month_text !~ '^[1-9][0-9]{0,18}$') OR (p_minimum_rental_days IS NOT NULL AND p_minimum_rental_days<=0) OR (p_security_deposit_amount_text IS NOT NULL AND p_security_deposit_amount_text !~ '^(0|[1-9][0-9]{0,18})$') THEN RAISE EXCEPTION 'invalid rental price contract' USING ERRCODE='OT422'; END IF;
    v_day:=p_rental_price_per_day_text::BIGINT; v_month:=NULLIF(p_rental_price_per_month_text,'')::BIGINT; v_deposit:=NULLIF(p_security_deposit_amount_text,'')::BIGINT;
  END IF;
  SELECT seller_type INTO v_seller_type FROM public.profiles WHERE id=v_user FOR SHARE; IF NOT FOUND THEN RAISE EXCEPTION 'seller profile required' USING ERRCODE='OT403'; END IF;
  IF p_city_id IS NULL OR NOT EXISTS(SELECT 1 FROM marketplace.cities c WHERE c.id=p_city_id AND c.is_active AND c.country_code='KZ') THEN RAISE EXCEPTION 'invalid city' USING ERRCODE='OT422'; END IF;
  IF p_district_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM marketplace.districts d WHERE d.id=p_district_id AND d.city_id=p_city_id AND d.is_active) THEN RAISE EXCEPTION 'invalid district' USING ERRCODE='OT422'; END IF;
  IF p_make_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM vehicle.makes m WHERE m.id=p_make_id AND m.is_active) THEN RAISE EXCEPTION 'invalid make and model' USING ERRCODE='OT422'; END IF;
  IF p_model_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM vehicle.models m WHERE m.id=p_model_id AND m.make_id=p_make_id AND m.is_active) THEN RAISE EXCEPTION 'invalid make and model' USING ERRCODE='OT422'; END IF;
  v_title:=COALESCE((SELECT concat_ws(' ',ma.name,mo.name,p_year::text) FROM vehicle.makes ma JOIN vehicle.models mo ON mo.make_id=ma.id WHERE ma.id=p_make_id AND mo.id=p_model_id), replace(p_vehicle_category::text,'_',' ')||' '||p_year::text);
  INSERT INTO vehicle.vehicle_profiles(make_id,model_id,variant_id,year,mileage_km,condition,fuel_type,transmission,body_type,drive_type,color,engine_volume_l,created_source,profile_status,created_by)
  VALUES(p_make_id,p_model_id,p_variant_id,p_year,p_mileage_km,p_condition,p_fuel_type,p_transmission,NULLIF(btrim(p_body_type),''),p_drive_type,NULLIF(btrim(p_color),''),p_engine_volume_l,'manual','active',v_user) RETURNING id INTO v_profile;
  INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES(v_profile,v_user,'owner',true);
  INSERT INTO marketplace.listings(vehicle_profile_id,seller_id,seller_type,status,moderation_status,title,title_generated,description,price_amount,currency,price_negotiable,city,city_id,district_id,seller_contact_phone_id,vehicle_category,listing_purpose,rental_price_per_day,rental_price_per_month,minimum_rental_days,security_deposit_amount,with_driver_or_operator)
  VALUES(v_profile,v_user,v_seller_type,'draft','draft',v_title,true,NULLIF(btrim(p_description),''),v_sale,p_currency,COALESCE(p_price_negotiable,false),btrim(p_city),p_city_id,p_district_id,p_seller_contact_phone_id,p_vehicle_category,p_listing_purpose,v_day,v_month,p_minimum_rental_days,v_deposit,p_with_driver_or_operator) RETURNING id,created_at INTO v_listing,v_created;
  INSERT INTO marketplace.listing_vehicle_category_details(listing_id,truck_body_type,bus_type,trailer_type,machinery_type,payload_capacity_kg,gross_weight_kg,axle_count,seat_count,operating_hours)
  VALUES(v_listing,NULLIF(btrim(p_truck_body_type),''),p_bus_type,NULLIF(btrim(p_trailer_type),''),NULLIF(btrim(p_machinery_type),''),p_payload_capacity_kg,p_gross_weight_kg,p_axle_count,p_seat_count,p_operating_hours);
  RETURN QUERY SELECT v_listing,v_profile,v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.create_own_listing_draft_v3(marketplace.vehicle_category,marketplace.listing_purpose,UUID,UUID,UUID,SMALLINT,INTEGER,TEXT,vehicle.fuel_type,vehicle.transmission_type,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT,BOOLEAN,TEXT,UUID,UUID,UUID,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,TEXT,TEXT,TEXT,TEXT,INTEGER,INTEGER,SMALLINT,SMALLINT,INTEGER) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.create_own_listing_draft_v3(marketplace.vehicle_category,marketplace.listing_purpose,UUID,UUID,UUID,SMALLINT,INTEGER,TEXT,vehicle.fuel_type,vehicle.transmission_type,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT,BOOLEAN,TEXT,UUID,UUID,UUID,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,TEXT,TEXT,TEXT,TEXT,INTEGER,INTEGER,SMALLINT,SMALLINT,INTEGER) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
