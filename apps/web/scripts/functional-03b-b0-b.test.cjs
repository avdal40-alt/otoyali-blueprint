const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const initialMigration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260922103057_functional_03b_b0_b_single_listing_search_matcher.sql"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260922103423_functional_03b_b0_b_matcher_document_assignment_fix.sql"), "utf8");
assert.match(initialMigration, /CREATE FUNCTION marketplace\.listing_matches_search_v1\(/);
assert.match(migration, /CREATE OR REPLACE FUNCTION marketplace\.listing_matches_search_v1\(/);
assert.equal((migration.match(/normalize_search_listings_v1_semantics/g) || []).length, 1);
assert.equal((migration.match(/search_listing_document_matches_v1/g) || []).length, 1);
assert.doesNotMatch(migration, /search_listings_v1\(/);
assert.doesNotMatch(migration, /SECURITY\s+DEFINER/);
assert.doesNotMatch(migration, /cardinality\(p_semantics\.make_ids\)/);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["seller", "make", "model", "vehicle"].map((key) => [key, randomUUID()]));
const listingIds = Array.from({ length: 65 }, () => randomUUID());
const outsideId = [...listingIds].sort()[64];
const fixtures = listingIds.map((id, index) => `('${id}', '${ids.vehicle}', '${ids.seller}', 'active', 'active', 'B0 B fixture ${index}', 100000, 'TRY', false, 'Istanbul', 'private')`).join(",");
const request = { version: "v1", limit: 60, sort: "price_asc", filters: { q: "B0 B" } };
const body = query(`BEGIN;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES ('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','b0b-${ids.seller}@test.invalid','{}','{}',now(),now());
INSERT INTO vehicle.makes(id,name,slug) VALUES ('${ids.make}','B0 B Make','b0-b-${ids.make}');
INSERT INTO vehicle.models(id,make_id,name,slug) VALUES ('${ids.model}','${ids.make}','B0 B Model','b0-b-${ids.model}');
INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES ('${ids.vehicle}','${ids.make}','${ids.model}',2024,100,'gasoline','automatic','manual','active','${ids.seller}');
INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.vehicle}','${ids.seller}','owner',true);
INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES ${fixtures};
WITH page AS (SELECT marketplace.search_listings_v1('${JSON.stringify(request)}'::jsonb) AS response)
SELECT jsonb_build_object(
  'page', page.response,
  'outside_match', marketplace.listing_matches_search_v1('${JSON.stringify(request)}'::jsonb, '${outsideId}'),
  'nonmatch', marketplace.listing_matches_search_v1('{"version":"v1","filters":{"q":"not-this-make"}}'::jsonb, '${listingIds[0]}'),
  'absent', marketplace.listing_matches_search_v1('${JSON.stringify(request)}'::jsonb, '${randomUUID()}'),
  'service_match', (SELECT result FROM (SELECT set_config('role', 'service_role', true), marketplace.listing_matches_search_v1('${JSON.stringify(request)}'::jsonb, '${listingIds[0]}') AS result) AS service_call)
) FROM page;
ROLLBACK;`).split(/\r?\n/).find((line) => line.startsWith("{"));
const result = JSON.parse(body);
assert.equal(result.page.items.length, 60, "public Search v1 remains capped at 60");
assert.ok(!result.page.items.some((item) => item.listing_id === outsideId), "known fixture is outside page one");
assert.equal(result.outside_match, true, "eligible fixture outside page one matches without pagination");
assert.equal(result.nonmatch, false, "nearby nonmatching eligible listing is false");
assert.equal(result.absent, false, "absent or ineligible projection listing is false");
assert.equal(result.service_match, true, "service-role path executes matcher");
assert.throws(() => query(`SELECT marketplace.listing_matches_search_v1('{"version":"v2","filters":{}}'::jsonb, '${listingIds[0]}');`));
const privilege = query("SELECT has_function_privilege('anon', 'marketplace.listing_matches_search_v1(jsonb,uuid)'::regprocedure, 'EXECUTE'), has_function_privilege('authenticated', 'marketplace.listing_matches_search_v1(jsonb,uuid)'::regprocedure, 'EXECUTE'), has_function_privilege('public', 'marketplace.listing_matches_search_v1(jsonb,uuid)'::regprocedure, 'EXECUTE'), has_function_privilege('service_role', 'marketplace.listing_matches_search_v1(jsonb,uuid)'::regprocedure, 'EXECUTE');").split("|");
assert.deepEqual(privilege, ["f", "f", "f", "t"]);
console.log("FUNCTIONAL-03B-B0-B single-listing Search v1 matcher contract passed");
