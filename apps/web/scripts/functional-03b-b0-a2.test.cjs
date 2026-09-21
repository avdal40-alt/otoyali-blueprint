const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260921130917_functional_03b_b0_a2_shared_search_v1_semantic_core.sql"), "utf8");
assert.match(migration, /CREATE TYPE marketplace\.search_listings_v1_semantics AS/);
assert.match(migration, /CREATE FUNCTION marketplace\.normalize_search_listings_v1_semantics\(p_request JSONB\)/);
assert.match(migration, /CREATE FUNCTION marketplace\.search_listing_document_matches_v1\([\s\S]*?p_document marketplace\.listing_search_documents/);
assert.doesNotMatch(migration, /SECURITY\s+DEFINER/);
assert.equal((migration.match(/CREATE FUNCTION marketplace\.normalize_search_listings_v1_semantics/g) || []).length, 1);
assert.equal((migration.match(/CREATE FUNCTION marketplace\.search_listing_document_matches_v1/g) || []).length, 1);
assert.doesNotMatch(migration.match(/CREATE FUNCTION marketplace\.search_listing_document_matches_v1[\s\S]*?\$\$([\s\S]*?)\$\$/)?.[1] || "", /FROM\s+marketplace\.listing_search_documents/i);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const valid = JSON.parse(query("SELECT row_to_json(s) FROM marketplace.normalize_search_listings_v1_semantics('{\"version\":\"v1\",\"filters\":{\"q\":\"  Audi  \",\"price_min\":100,\"has_photos\":true}}'::jsonb) AS s;"));
assert.equal(valid.query, "Audi");
assert.equal(valid.price_min, 100);
assert.equal(valid.has_photos, true);
assert.throws(() => query("SELECT marketplace.normalize_search_listings_v1_semantics('{\"version\":\"v1\",\"filters\":{\"price_min\":\"100\"}}'::jsonb);"));

const result = JSON.parse(query("WITH document AS (SELECT d FROM marketplace.listing_search_documents AS d LIMIT 1), semantics AS (SELECT marketplace.normalize_search_listings_v1_semantics('{\"version\":\"v1\",\"filters\":{}}'::jsonb) AS s) SELECT jsonb_build_object('match', COALESCE((SELECT marketplace.search_listing_document_matches_v1(s, d) FROM semantics, document), true), 'non_match', COALESCE((SELECT marketplace.search_listing_document_matches_v1((ROW((s).query, 'impossible-condition', (s).price_min, (s).price_max, (s).year_min, (s).year_max, (s).mileage_min, (s).mileage_max, (s).engine_volume_min, (s).engine_volume_max, (s).power_kw_min, (s).power_kw_max, (s).battery_capacity_kwh_min, (s).battery_capacity_kwh_max, (s).electric_range_km_min, (s).electric_range_km_max, (s).trade_in_accepted, (s).price_negotiable, (s).has_photos, (s).has_video, (s).make_ids, (s).model_ids, (s).variant_ids, (s).city_ids, (s).district_ids, (s).fuel_types, (s).transmissions, (s).body_types, (s).drive_types, (s).colors, (s).seller_types, (s).service_declarations, (s).damage_declarations))::marketplace.search_listings_v1_semantics, d) FROM semantics, document), false));"));
assert.equal(result.match, true, "empty semantics match a supplied document");
assert.equal(result.non_match, false, "nearby nonmatching semantics reject the same supplied document");
assert.equal(query("BEGIN; SET LOCAL ROLE anon; SELECT (marketplace.normalize_search_listings_v1_semantics('{\"version\":\"v1\",\"filters\":{\"q\":\"Audi\"}}'::jsonb)).query; ROLLBACK;").split(/\r?\n/).find((line) => line === "Audi"), "Audi", "anon can receive only normalized input criteria");
assert.equal(query("SELECT p.proretset::text FROM pg_proc AS p WHERE p.oid = 'marketplace.search_listing_document_matches_v1(marketplace.search_listings_v1_semantics, marketplace.listing_search_documents)'::regprocedure;"), "false");
assert.equal(query("SELECT p.prorettype = 'bool'::regtype FROM pg_proc AS p WHERE p.oid = 'marketplace.search_listing_document_matches_v1(marketplace.search_listings_v1_semantics, marketplace.listing_search_documents)'::regprocedure;"), "t", "anon-callable predicate cannot return listing rows");
assert.equal(query("SELECT jsonb_array_length(marketplace.search_listings_v1('{\"version\":\"v1\",\"limit\":60,\"filters\":{}}'::jsonb)->'items') <= 60;"), "t");
console.log("FUNCTIONAL-03B-B0-A2 shared Search v1 semantic core contract passed");
