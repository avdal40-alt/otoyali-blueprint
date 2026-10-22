const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-X", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const id = Object.fromEntries(["seller", "make", "model", "kzVehicle", "trVehicle", "kzListing", "trListing", "kzCity", "trCity"].map((name) => [name, randomUUID()]));

const sql = `BEGIN;
  CREATE TEMP TABLE result (name text primary key, actual text) ON COMMIT DROP;
  GRANT SELECT, INSERT ON result TO anon;
  INSERT INTO auth.users (instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000','${id.seller}','authenticated','authenticated','jlc0521-${id.seller}@test.invalid','{}','{}',now(),now());
  INSERT INTO marketplace.cities(id,name,slug,country_code,is_active) VALUES
    ('${id.kzCity}','JLC KZ City ${id.kzCity}','jlc-kz-${id.kzCity}','KZ',true),
    ('${id.trCity}','JLC TR City ${id.trCity}','jlc-tr-${id.trCity}','TR',true);
  INSERT INTO vehicle.makes(id,name,slug) VALUES('${id.make}','JLC 0521 Make ${id.make}','jlc-0521-make-${id.make}');
  INSERT INTO vehicle.models(id,make_id,name,slug) VALUES('${id.model}','${id.make}','JLC 0521 Model ${id.model}','jlc-0521-model-${id.model}');
  INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES
    ('${id.kzVehicle}','${id.make}','${id.model}',2024,1,'gasoline','automatic','manual','active','${id.seller}'),
    ('${id.trVehicle}','${id.make}','${id.model}',2024,1,'gasoline','automatic','manual','active','${id.seller}');
  INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES
    ('${id.kzVehicle}','${id.seller}','owner',true),
    ('${id.trVehicle}','${id.seller}','owner',true);
  INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,city_id,seller_type,seller_display_name,published_at) VALUES
    ('${id.kzListing}','${id.kzVehicle}','${id.seller}','active','active','JLC KZ listing',100,'KZT',false,'JLC KZ City','${id.kzCity}','dealer','JLC dealer',now()),
    ('${id.trListing}','${id.trVehicle}','${id.seller}','active','active','JLC TR listing',100,'TRY',false,'JLC TR City','${id.trCity}','dealer','JLC dealer',now());
  SET LOCAL ROLE anon;
  INSERT INTO result SELECT 'home', coalesce(string_agg(listing_id::text,',' ORDER BY listing_id),'') FROM public.ff_home_listings WHERE listing_id IN ('${id.kzListing}','${id.trListing}');
  INSERT INTO result SELECT 'detail_kz', count(*)::text FROM public.ff_listing_details WHERE listing_id='${id.kzListing}';
  INSERT INTO result SELECT 'detail_tr', count(*)::text FROM public.ff_listing_details WHERE listing_id='${id.trListing}';
  INSERT INTO result SELECT 'documents', coalesce(string_agg(listing_id::text,',' ORDER BY listing_id),'') FROM marketplace.listing_search_documents WHERE listing_id IN ('${id.kzListing}','${id.trListing}');
  INSERT INTO result SELECT 'search', coalesce(string_agg(item->>'listing_id',',' ORDER BY item->>'listing_id'),'') FROM jsonb_array_elements(marketplace.search_listings_v1('{"version":"v1","filters":{}}'::jsonb)->'items') item WHERE item->>'listing_id' IN ('${id.kzListing}','${id.trListing}');
  INSERT INTO result SELECT 'count', marketplace.count_search_listings_v1('{"version":"v1","filters":{}}'::jsonb)::text;
  RESET ROLE;
  INSERT INTO result VALUES ('matcher_kz', marketplace.listing_matches_search_v1('{"version":"v1","filters":{}}'::jsonb,'${id.kzListing}')::text);
  INSERT INTO result VALUES ('matcher_tr', marketplace.listing_matches_search_v1('{"version":"v1","filters":{}}'::jsonb,'${id.trListing}')::text);
  INSERT INTO result SELECT 'tr_preserved', country_code FROM marketplace.cities WHERE id='${id.trCity}';
  SELECT name, actual FROM result ORDER BY name;
  ROLLBACK;`;

const rows = Object.fromEntries(query(sql).split(/\r?\n/).filter(Boolean).map((line) => line.split("|")));
assert.equal(rows.home, id.kzListing, "homepage/dealer projection must expose KZ only");
assert.equal(rows.detail_kz, "1", "KZ public detail must remain readable");
assert.equal(rows.detail_tr, "0", "known TR UUID must not resolve in public KZ detail");
assert.equal(rows.documents, id.kzListing, "direct public projection reads must be KZ-only");
assert.equal(rows.search, id.kzListing, "Search v1 must return KZ only");
assert.equal(rows.matcher_kz, "true", "KZ saved-search/price-drop matcher must work");
assert.equal(rows.matcher_tr, "false", "TR records must not match KZ notifications");
assert.equal(rows.tr_preserved, "TR", "historical Turkey market identity must remain unchanged");
assert.ok(Number(rows.count) >= 1, "public KZ count must remain usable");
console.log("JLC-0521 Kazakhstan public read-isolation matrix passed");
