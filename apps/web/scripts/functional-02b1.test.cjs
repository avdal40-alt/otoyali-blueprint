const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "supabase",
  "migrations",
  "20260912153000_functional_02b1_core_turkey_vehicle_schema.sql"
);
const migration = fs.readFileSync(migrationPath, "utf8");

for (const expected of [
  "CREATE TABLE vehicle.variants",
  "model_id UUID NOT NULL REFERENCES vehicle.models(id) ON DELETE RESTRICT",
  "CONSTRAINT vehicle_variants_model_slug_unique UNIQUE (model_id, slug)",
  "FOREIGN KEY (variant_id, model_id)",
  "REFERENCES vehicle.variants (id, model_id)",
  "CREATE TABLE marketplace.districts",
  "city_id UUID NOT NULL REFERENCES marketplace.cities(id) ON DELETE RESTRICT",
  "ADD COLUMN city_id UUID",
  "ADD COLUMN district_id UUID",
  "FOREIGN KEY (city_id)",
  "REFERENCES marketplace.cities (id)",
  "FOREIGN KEY (district_id, city_id)",
  "REFERENCES marketplace.districts (id, city_id)",
  "ADD COLUMN trade_in_accepted BOOLEAN NOT NULL DEFAULT FALSE",
  "ADD COLUMN power_kw SMALLINT",
  "ADD COLUMN battery_capacity_kwh NUMERIC(6, 1)",
  "ADD COLUMN electric_range_km SMALLINT",
  "ADD COLUMN hybrid_type vehicle.hybrid_type",
  "ALTER TABLE vehicle.variants ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE marketplace.districts ENABLE ROW LEVEL SECURITY",
  "CREATE POLICY vehicle_variants_select_active",
  "CREATE POLICY marketplace_districts_select_active",
  "GRANT SELECT ON vehicle.variants TO anon, authenticated",
  "GRANT SELECT ON marketplace.districts TO anon, authenticated"
]) {
  assert.ok(migration.includes(expected), `Expected migration content: ${expected}`);
}

assert.match(migration, /vehicle_profiles_power_kw_chk[\s\S]*?BETWEEN 1 AND 2000/);
assert.match(migration, /vehicle_profiles_variant_model_fk[\s\S]*?ON DELETE RESTRICT NOT VALID/);
assert.match(migration, /vehicle_profiles_battery_capacity_kwh_chk[\s\S]*?battery_capacity_kwh > 0/);
assert.match(migration, /vehicle_profiles_electric_range_km_chk[\s\S]*?BETWEEN 1 AND 3000/);
assert.match(migration, /listings_district_requires_city_chk[\s\S]*?district_id IS NULL OR city_id IS NOT NULL/);
assert.match(migration, /COMMENT ON COLUMN marketplace\.listings\.trade_in_accepted[\s\S]*?does not create a payment or escrow flow/);
assert.doesNotMatch(migration, /\b(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE[\s\S]*?\bDROP\b)\b/i);
assert.doesNotMatch(migration, /GRANT\s+(?:ALL(?:\s+PRIVILEGES)?|[^;]*(?:\bINSERT\b|\bUPDATE\b|\bDELETE\b))[^;]*\bTO\s+(?:anon|authenticated|public)\b/i);
assert.doesNotMatch(migration, /GRANT\s+UPDATE\s+ON\s+vehicle\.vehicle_profiles\s+TO\s+authenticated/i);

console.log("FUNCTIONAL-02B1 schema contract passed");
