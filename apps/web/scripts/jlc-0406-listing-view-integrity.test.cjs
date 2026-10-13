const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const route = read("src", "app", "api", "listings", "[id]", "view", "route.ts");
const migration = read("..", "..", "supabase", "migrations", "20261013143000_jlc0406_harden_listing_view_events.sql");

assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/, "view route must use a server-only credential");
assert.match(route, /createClient\(url, serviceKey/, "view route must use the trusted client");
assert.doesNotMatch(route, /getSupabaseServerClient/, "anon client must not invoke the view RPC");
assert.match(route, /httpOnly: true/, "viewer key must remain inaccessible to browser JavaScript");
assert.match(migration, /REVOKE ALL ON FUNCTION public\.record_listing_view\(UUID, UUID\) FROM anon, authenticated;/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.record_listing_view\(UUID, UUID\) TO service_role;/);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-X", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["seller", "listing", "vehicle", "make", "model", "viewer"].map((name) => [name, randomUUID()]));
const sql = `BEGIN;
  CREATE TEMP TABLE results (name text PRIMARY KEY, ok boolean NOT NULL) ON COMMIT DROP;
  GRANT SELECT, INSERT ON results TO service_role;
  INSERT INTO auth.users (instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','view-seller-${ids.seller}@test.invalid','{}','{}',now(),now());
  INSERT INTO vehicle.makes(id,name,slug) VALUES('${ids.make}','View Make','view-${ids.make}');
  INSERT INTO vehicle.models(id,make_id,name,slug) VALUES('${ids.model}','${ids.make}','View Model','view-${ids.model}');
  INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by)
  VALUES('${ids.vehicle}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.seller}');
  INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES('${ids.vehicle}','${ids.seller}','owner',true);
  INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type)
  VALUES('${ids.listing}','${ids.vehicle}','${ids.seller}','active','active','View integrity listing',1,'KZT',false,'Almaty','private');
  INSERT INTO results VALUES
    ('view event table is private', NOT has_table_privilege('anon','marketplace.listing_view_events','SELECT,INSERT,UPDATE,DELETE') AND NOT has_table_privilege('authenticated','marketplace.listing_view_events','SELECT,INSERT,UPDATE,DELETE')),
    ('view RPC is trusted-server only', NOT has_function_privilege('anon','public.record_listing_view(uuid,uuid)','EXECUTE') AND NOT has_function_privilege('authenticated','public.record_listing_view(uuid,uuid)','EXECUTE') AND has_function_privilege('service_role','public.record_listing_view(uuid,uuid)','EXECUTE'));
  SET LOCAL ROLE service_role;
  INSERT INTO results VALUES ('first trusted view records', public.record_listing_view('${ids.listing}','${ids.viewer}'));
  INSERT INTO results VALUES ('same browser refresh is deduplicated', NOT public.record_listing_view('${ids.listing}','${ids.viewer}'));
  RESET ROLE;
  INSERT INTO results VALUES
    ('single event increments aggregate once', (SELECT views_count = 1 FROM marketplace.listings WHERE id='${ids.listing}') AND (SELECT count(*) = 1 FROM marketplace.listing_view_events WHERE listing_id='${ids.listing}')),
    ('RLS remains enabled', (SELECT relrowsecurity FROM pg_class WHERE oid='marketplace.listing_view_events'::regclass));
  SELECT name, ok FROM results ORDER BY name;
  ROLLBACK;`;
const rows = query(sql).split(/\r?\n/).filter((line) => line.includes("|")).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
assert.equal(rows.length, 6, JSON.stringify(rows));
console.log(`JLC-0406 listing view integrity: PASS (${rows.length} checks)`);
