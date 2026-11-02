BEGIN;

-- V2 edits deliberately preserve the category and purpose selected at draft
-- creation. A seller can update the category-specific facts and commercial
-- terms, but cannot use this owner endpoint to reclassify an existing record.
CREATE OR REPLACE FUNCTION public.save_own_listing_v2_edit(
  p_listing_id UUID,
  p_expected_listing_updated_at TIMESTAMPTZ,
  p_expected_vehicle_updated_at TIMESTAMPTZ,
  p_year SMALLINT,
  p_mileage_km INTEGER,
  p_condition TEXT,
  p_fuel_type vehicle.fuel_type,
  p_transmission vehicle.transmission_type,
  p_body_type TEXT,
  p_drive_type TEXT,
  p_color TEXT,
  p_engine_volume_l NUMERIC,
  p_description TEXT,
  p_sale_price_amount_text TEXT,
  p_currency TEXT,
  p_price_negotiable BOOLEAN,
  p_city TEXT,
  p_city_id UUID,
  p_district_id UUID,
  p_rental_price_per_day_text TEXT DEFAULT NULL,
  p_rental_price_per_month_text TEXT DEFAULT NULL,
  p_minimum_rental_days INTEGER DEFAULT NULL,
  p_security_deposit_amount_text TEXT DEFAULT NULL,
  p_with_driver_or_operator BOOLEAN DEFAULT NULL,
  p_truck_body_type TEXT DEFAULT NULL,
  p_bus_type TEXT DEFAULT NULL,
  p_trailer_type TEXT DEFAULT NULL,
  p_machinery_type TEXT DEFAULT NULL,
  p_payload_capacity_kg INTEGER DEFAULT NULL,
  p_gross_weight_kg INTEGER DEFAULT NULL,
  p_axle_count SMALLINT DEFAULT NULL,
  p_seat_count SMALLINT DEFAULT NULL,
  p_operating_hours INTEGER DEFAULT NULL
)
RETURNS TABLE(
  saved_listing_id UUID,
  saved_listing_updated_at TIMESTAMPTZ,
  saved_vehicle_updated_at TIMESTAMPTZ,
  saved_status TEXT,
  saved_moderation_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketplace, vehicle, identity, pg_catalog
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_listing marketplace.listings%ROWTYPE;
  v_profile vehicle.vehicle_profiles%ROWTYPE;
  v_sale BIGINT;
  v_day BIGINT;
  v_month BIGINT;
  v_deposit BIGINT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='OT401'; END IF;
  IF public.is_admin(v_user) THEN RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE='OT403'; END IF;

  SELECT * INTO v_listing FROM marketplace.listings
  WHERE id=p_listing_id AND seller_id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing not found' USING ERRCODE='OT404'; END IF;
  IF v_listing.status NOT IN ('draft','rejected') OR v_listing.moderation_status NOT IN ('draft','rejected') THEN
    RAISE EXCEPTION 'listing is not editable' USING ERRCODE='OT409';
  END IF;
  IF v_listing.updated_at IS DISTINCT FROM p_expected_listing_updated_at THEN
    RAISE EXCEPTION 'listing has changed' USING ERRCODE='OT409';
  END IF;
  PERFORM identity.require_kazakhstan_seller_contact_phone(v_user, v_listing.seller_contact_phone_id);

  SELECT * INTO v_profile FROM vehicle.vehicle_profiles WHERE id=v_listing.vehicle_profile_id FOR UPDATE;
  IF NOT FOUND OR v_profile.updated_at IS DISTINCT FROM p_expected_vehicle_updated_at THEN
    RAISE EXCEPTION 'vehicle profile has changed' USING ERRCODE='OT409';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vehicle.profile_ownership o WHERE o.vehicle_profile_id=v_profile.id AND o.owner_id=v_user AND o.is_current) THEN
    RAISE EXCEPTION 'vehicle ownership required' USING ERRCODE='OT403';
  END IF;
  IF p_year IS NULL OR p_year < 1900 OR p_year > EXTRACT(YEAR FROM now())::INT+1
    OR p_condition NOT IN ('new','used') OR p_currency <> 'KZT' OR p_city IS NULL OR char_length(btrim(p_city))=0 THEN
    RAISE EXCEPTION 'invalid listing edit fields' USING ERRCODE='OT422';
  END IF;
  IF p_city_id IS NULL OR NOT EXISTS (SELECT 1 FROM marketplace.cities c WHERE c.id=p_city_id AND c.is_active AND c.country_code='KZ') THEN
    RAISE EXCEPTION 'invalid city' USING ERRCODE='OT422';
  END IF;
  IF p_district_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM marketplace.districts d WHERE d.id=p_district_id AND d.city_id=p_city_id AND d.is_active) THEN
    RAISE EXCEPTION 'invalid district' USING ERRCODE='OT422';
  END IF;
  IF v_listing.vehicle_category='passenger_car' AND (p_mileage_km IS NULL OR p_fuel_type IS NULL OR p_transmission IS NULL) THEN
    RAISE EXCEPTION 'passenger car details required' USING ERRCODE='OT422';
  END IF;
  IF v_listing.vehicle_category='trailer' AND (p_mileage_km IS NOT NULL OR p_fuel_type IS NOT NULL OR p_transmission IS NOT NULL OR p_engine_volume_l IS NOT NULL) THEN
    RAISE EXCEPTION 'trailer cannot include engine or mileage fields' USING ERRCODE='OT422';
  END IF;
  IF p_mileage_km IS NOT NULL AND ((p_condition='new' AND p_mileage_km<>0) OR (p_condition='used' AND p_mileage_km<=0)) THEN
    RAISE EXCEPTION 'invalid condition and mileage combination' USING ERRCODE='OT422';
  END IF;
  IF p_fuel_type='electric' AND p_engine_volume_l IS NOT NULL THEN RAISE EXCEPTION 'electric vehicles cannot include engine volume' USING ERRCODE='OT422'; END IF;
  IF p_fuel_type IS NOT NULL AND p_fuel_type<>'electric' AND p_engine_volume_l IS NULL THEN RAISE EXCEPTION 'engine volume required' USING ERRCODE='OT422'; END IF;
  IF v_listing.vehicle_category<>'truck' AND p_truck_body_type IS NOT NULL THEN RAISE EXCEPTION 'truck details are not valid for this category' USING ERRCODE='OT422'; END IF;
  IF v_listing.vehicle_category<>'bus' AND (p_bus_type IS NOT NULL OR p_seat_count IS NOT NULL) THEN RAISE EXCEPTION 'bus details are not valid for this category' USING ERRCODE='OT422'; END IF;
  IF v_listing.vehicle_category<>'trailer' AND p_trailer_type IS NOT NULL THEN RAISE EXCEPTION 'trailer details are not valid for this category' USING ERRCODE='OT422'; END IF;
  IF v_listing.vehicle_category<>'special_machinery' AND (p_machinery_type IS NOT NULL OR p_operating_hours IS NOT NULL) THEN RAISE EXCEPTION 'machinery details are not valid for this category' USING ERRCODE='OT422'; END IF;
  IF v_listing.vehicle_category NOT IN ('truck','trailer') AND (p_payload_capacity_kg IS NOT NULL OR p_gross_weight_kg IS NOT NULL OR p_axle_count IS NOT NULL) THEN RAISE EXCEPTION 'commercial capacity details are not valid for this category' USING ERRCODE='OT422'; END IF;

  IF v_listing.listing_purpose='sale' THEN
    IF p_sale_price_amount_text IS NULL OR p_sale_price_amount_text !~ '^[1-9][0-9]{0,18}$' OR p_rental_price_per_day_text IS NOT NULL OR p_rental_price_per_month_text IS NOT NULL OR p_minimum_rental_days IS NOT NULL OR p_security_deposit_amount_text IS NOT NULL OR p_with_driver_or_operator IS NOT NULL THEN RAISE EXCEPTION 'invalid sale price contract' USING ERRCODE='OT422'; END IF;
    v_sale:=p_sale_price_amount_text::BIGINT;
  ELSE
    IF p_sale_price_amount_text IS NOT NULL OR p_rental_price_per_day_text IS NULL OR p_rental_price_per_day_text !~ '^[1-9][0-9]{0,18}$' OR (p_rental_price_per_month_text IS NOT NULL AND p_rental_price_per_month_text !~ '^[1-9][0-9]{0,18}$') OR (p_minimum_rental_days IS NOT NULL AND p_minimum_rental_days<=0) OR (p_security_deposit_amount_text IS NOT NULL AND p_security_deposit_amount_text !~ '^(0|[1-9][0-9]{0,18})$') THEN RAISE EXCEPTION 'invalid rental price contract' USING ERRCODE='OT422'; END IF;
    v_day:=p_rental_price_per_day_text::BIGINT; v_month:=NULLIF(p_rental_price_per_month_text,'')::BIGINT; v_deposit:=NULLIF(p_security_deposit_amount_text,'')::BIGINT;
  END IF;

  UPDATE vehicle.vehicle_profiles SET year=p_year,mileage_km=p_mileage_km,condition=p_condition,fuel_type=p_fuel_type,transmission=p_transmission,body_type=NULLIF(btrim(p_body_type),''),drive_type=p_drive_type,color=NULLIF(btrim(p_color),''),engine_volume_l=p_engine_volume_l
  WHERE id=v_profile.id RETURNING updated_at INTO saved_vehicle_updated_at;
  UPDATE marketplace.listing_vehicle_category_details SET truck_body_type=NULLIF(btrim(p_truck_body_type),''),bus_type=p_bus_type,trailer_type=NULLIF(btrim(p_trailer_type),''),machinery_type=NULLIF(btrim(p_machinery_type),''),payload_capacity_kg=p_payload_capacity_kg,gross_weight_kg=p_gross_weight_kg,axle_count=p_axle_count,seat_count=p_seat_count,operating_hours=p_operating_hours
  WHERE listing_id=p_listing_id;
  UPDATE marketplace.listings SET description=NULLIF(btrim(p_description),''),price_amount=v_sale,currency=p_currency,price_negotiable=COALESCE(p_price_negotiable,false),city=btrim(p_city),city_id=p_city_id,district_id=p_district_id,rental_price_per_day=v_day,rental_price_per_month=v_month,minimum_rental_days=p_minimum_rental_days,security_deposit_amount=v_deposit,with_driver_or_operator=p_with_driver_or_operator
  WHERE id=p_listing_id RETURNING id,updated_at,status::TEXT,moderation_status INTO saved_listing_id,saved_listing_updated_at,saved_status,saved_moderation_status;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.save_own_listing_v2_edit(UUID,TIMESTAMPTZ,TIMESTAMPTZ,SMALLINT,INTEGER,TEXT,vehicle.fuel_type,vehicle.transmission_type,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT,BOOLEAN,TEXT,UUID,UUID,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,TEXT,TEXT,TEXT,TEXT,INTEGER,INTEGER,SMALLINT,SMALLINT,INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_own_listing_v2_edit(UUID,TIMESTAMPTZ,TIMESTAMPTZ,SMALLINT,INTEGER,TEXT,vehicle.fuel_type,vehicle.transmission_type,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT,BOOLEAN,TEXT,UUID,UUID,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,TEXT,TEXT,TEXT,TEXT,INTEGER,INTEGER,SMALLINT,SMALLINT,INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
