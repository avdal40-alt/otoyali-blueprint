const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { spawnSync } = require("node:child_process");

const owner = randomUUID();
const other = randomUUID();
const contact = randomUUID();
const suffix = String(Date.now()).slice(-8);
const phone = `+770${suffix}`;
const sql = `
BEGIN;
CREATE TEMP TABLE v2_results (name text primary key, ok boolean not null) ON COMMIT DROP;
GRANT SELECT, INSERT ON v2_results TO authenticated, service_role;
CREATE TEMP TABLE v2_listings (id uuid primary key, category marketplace.vehicle_category, purpose marketplace.listing_purpose) ON COMMIT DROP;
GRANT SELECT, INSERT ON v2_listings TO authenticated, service_role;
INSERT INTO auth.users(instance_id,id,aud,role,phone,phone_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
  ('00000000-0000-0000-0000-000000000000','${owner}','authenticated','authenticated','${phone}',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','${other}','authenticated','authenticated','+771${suffix}',now(),'{}','{}',now(),now());
INSERT INTO identity.verified_seller_contact_phones(id,user_id,phone_e164,verified_at,verification_source,is_current_account_phone,is_active)
  VALUES('${contact}','${owner}','${phone}',now(),'seller_otp',false,true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"${owner}"}', true);
DO $$
DECLARE v_make uuid; v_model uuid; v_city uuid; v_category marketplace.vehicle_category; v_purpose marketplace.listing_purpose; v_listing uuid;
BEGIN
  SELECT mo.make_id, mo.id INTO v_make, v_model FROM vehicle.models mo JOIN vehicle.makes ma ON ma.id=mo.make_id WHERE ma.is_active AND mo.is_active ORDER BY mo.id LIMIT 1;
  SELECT id INTO v_city FROM marketplace.cities WHERE country_code='KZ' AND is_active ORDER BY sort_order,id LIMIT 1;
  FOREACH v_category IN ARRAY ARRAY['passenger_car','truck','bus','trailer','special_machinery']::marketplace.vehicle_category[] LOOP
    FOREACH v_purpose IN ARRAY ARRAY['sale','rent']::marketplace.listing_purpose[] LOOP
      SELECT listing_id INTO v_listing FROM public.create_own_listing_draft_v3(
        p_vehicle_category:=v_category, p_listing_purpose:=v_purpose, p_make_id:=v_make, p_model_id:=v_model, p_variant_id:=NULL::uuid,
        p_year:=2022::smallint, p_mileage_km:=CASE WHEN v_category='trailer' THEN NULL ELSE 100 END,
        p_condition:='used', p_fuel_type:=CASE WHEN v_category='trailer' THEN NULL ELSE 'gasoline'::vehicle.fuel_type END,
        p_transmission:=CASE WHEN v_category='trailer' THEN NULL ELSE 'automatic'::vehicle.transmission_type END,
        p_body_type:='sedan', p_drive_type:='front', p_color:='black', p_engine_volume_l:=CASE WHEN v_category='trailer' THEN NULL ELSE 1.6::numeric END,
        p_description:='V2 runtime matrix', p_sale_price_amount_text:=CASE WHEN v_purpose='sale' THEN '1000000' END,
        p_currency:='KZT', p_price_negotiable:=false, p_city:='Almaty', p_seller_contact_phone_id:='${contact}'::uuid, p_city_id:=v_city, p_district_id:=NULL::uuid,
        p_rental_price_per_day_text:=CASE WHEN v_purpose='rent' THEN '10000' END,
        p_minimum_rental_days:=CASE WHEN v_purpose='rent' THEN 1 END,
        p_with_driver_or_operator:=CASE WHEN v_purpose='rent' THEN false END,
        p_truck_body_type:=CASE WHEN v_category='truck' THEN 'box' END,
        p_bus_type:=CASE WHEN v_category='bus' THEN 'city' END,
        p_trailer_type:=CASE WHEN v_category='trailer' THEN 'flatbed' END,
        p_machinery_type:=CASE WHEN v_category='special_machinery' THEN 'loader' END,
        p_payload_capacity_kg:=CASE WHEN v_category IN ('truck','trailer') THEN 1000 END,
        p_gross_weight_kg:=CASE WHEN v_category IN ('truck','trailer') THEN 2000 END,
        p_axle_count:=CASE WHEN v_category IN ('truck','trailer') THEN 2::smallint END,
        p_seat_count:=CASE WHEN v_category='bus' THEN 20::smallint END,
        p_operating_hours:=CASE WHEN v_category='special_machinery' THEN 10 END
      );
      INSERT INTO v2_listings VALUES(v_listing,v_category,v_purpose);
    END LOOP;
  END LOOP;
END $$;
INSERT INTO v2_results VALUES ('all_ten_combinations_created',(SELECT count(*)=10 FROM v2_listings));
DO $$ DECLARE r record; BEGIN FOR r IN SELECT id FROM v2_listings LOOP PERFORM public.submit_own_listing_for_review(r.id); END LOOP; END $$;
INSERT INTO v2_results VALUES ('all_ten_submit_for_moderation',(SELECT count(*)=10 AND bool_and(moderation_status='pending_review') FROM v2_listings x JOIN marketplace.listings l ON l.id=x.id));
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"${other}"}', true);
DO $$ BEGIN
  PERFORM public.submit_own_listing_for_review((SELECT id FROM v2_listings LIMIT 1));
  INSERT INTO v2_results VALUES ('non_owner_submit_denied',false);
EXCEPTION WHEN OTHERS THEN INSERT INTO v2_results VALUES ('non_owner_submit_denied',true); END $$;
RESET ROLE;
INSERT INTO v2_results VALUES ('sale_and_rent_price_contracts',(SELECT bool_and((purpose='sale' AND price_amount IS NOT NULL AND rental_price_per_day IS NULL) OR (purpose='rent' AND price_amount IS NULL AND rental_price_per_day IS NOT NULL)) FROM v2_listings x JOIN marketplace.listings l ON l.id=x.id));
INSERT INTO v2_results VALUES ('trailer_has_no_engine_or_mileage',(SELECT count(*)=2 AND bool_and(vp.mileage_km IS NULL AND vp.engine_volume_l IS NULL) FROM v2_listings x JOIN marketplace.listings l ON l.id=x.id JOIN vehicle.vehicle_profiles vp ON vp.id=l.vehicle_profile_id WHERE x.category='trailer'));
INSERT INTO v2_results VALUES ('category_details_persisted',(SELECT count(*)=10 FROM v2_listings x JOIN marketplace.listing_vehicle_category_details d ON d.listing_id=x.id));
SELECT name,ok FROM v2_results ORDER BY name;
ROLLBACK;`;

const result = spawnSync("docker", ["exec", "-i", "supabase_db_Otoyali-blueprint", "psql", "-X", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], { input: sql, encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);
const rows = result.stdout.trim().split(/\r?\n/).filter((line) => line.includes("|")).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], result.stdout);
assert.equal(rows.length, 6, result.stdout);
console.log("vehicle-marketplace-v2 runtime matrix: PASS");
