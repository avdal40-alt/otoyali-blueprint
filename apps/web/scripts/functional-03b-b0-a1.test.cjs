const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260913100000_functional_02c2_search_request.sql"), "utf8");
const source = fs.readFileSync(path.join(root, "supabase", "migrations", "20260912153003_functional_02c1b1_listing_search_projection_schema.sql"), "utf8");
assert.match(migration, /CREATE FUNCTION marketplace\.search_listings_v1\(p_request JSONB\)/);
assert.match(migration, /FROM marketplace\.listing_search_documents AS d/);
assert.match(source, /CREATE TABLE marketplace\.listing_search_documents/);
for (const filter of ["make_ids", "model_ids", "variant_ids", "city_ids", "district_ids", "price_min", "price_max", "year_min", "year_max", "mileage_min", "mileage_max", "fuel_types", "transmissions", "body_types", "drive_types", "colors", "seller_types", "engine_volume_min", "power_kw_min", "battery_capacity_kwh_min", "electric_range_km_min", "seller_service_declarations", "seller_damage_declarations", "trade_in_accepted", "price_negotiable", "has_photos", "has_video"]) assert.match(migration, new RegExp(`'${filter}'`));
for (const sort of ["newest", "price_asc", "price_desc", "year_desc", "mileage_asc"]) assert.match(migration, new RegExp(`'${sort}'`));
for (const token of ["ILIKE", "ESCAPE E'\\\\'", "LIMIT v_limit", "d.listing_id ASC", "jsonb_build_object('version', 'v1'"]) assert.ok(migration.includes(token), token);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const invoke = (request) => JSON.parse(query(`SELECT marketplace.search_listings_v1('${JSON.stringify(request).replaceAll("'", "''")}'::jsonb);`));
const response = invoke({ version: "v1", limit: 1, sort: "newest", filters: {} });
assert.deepEqual(Object.keys(response).sort(), ["items", "next_cursor", "version"]);
assert.equal(response.version, "v1"); assert.ok(Array.isArray(response.items)); assert.ok(response.items.length <= 1);
for (const item of response.items) assert.deepEqual(Object.keys(item).sort(), ["battery_capacity_kwh","body_type","city_id","city_name","color","condition","cover_image_url","currency","district_id","district_name","drive_type","electric_range_km","engine_volume_l","fuel_type","has_video","listing_id","make_id","make_name","mileage_km","model_id","model_name","photo_count","power_kw","price_amount","price_negotiable","projected_at","published_at","seller_damage_declaration","seller_service_declaration","seller_type","trade_in_accepted","transmission","variant_id","variant_name","year"].sort());
for (const invalid of [{ version: "v2" }, { version: "v1", filters: { unknown: true } }, { version: "v1", limit: 61 }, { version: "v1", sort: "unknown" }]) assert.throws(() => invoke(invalid));
console.log("FUNCTIONAL-03B-B0-A1 Search v1 characterization contract passed");
