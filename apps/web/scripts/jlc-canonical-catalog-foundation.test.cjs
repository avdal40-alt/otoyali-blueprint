const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261014100000_jlc_canonical_vehicle_catalog_foundation.sql"), "utf8");
const contract = fs.readFileSync(path.join(root, "apps", "web", "src", "lib", "vehicle", "canonical-catalog-contract.ts"), "utf8");

for (const fragment of [
  "CREATE TABLE vehicle.catalog_datasets",
  "CREATE TABLE vehicle.catalog_specifications",
  "REFERENCES vehicle.modifications(id) ON DELETE RESTRICT",
  "CREATE TABLE vehicle.catalog_market_overrides",
  "validate_catalog_market_override_target",
  "makes_catalog_dataset_source_key_unique_idx",
  "generations_catalog_dataset_source_key_unique_idx",
  "catalog_specifications_dataset_source_key_unique",
  "ENABLE ROW LEVEL SECURITY",
  "catalog_datasets_service_role_all",
]) assert.ok(migration.includes(fragment), `missing ${fragment}`);

assert.doesNotMatch(migration, /INSERT\s+INTO\s+vehicle\.(generations|modifications|catalog_specifications)/i, "foundation must not invent catalog data");
assert.match(contract, /CANONICAL_CATALOG_IMPORT_FORMAT = "jolcar-catalog\/v1"/);
assert.match(contract, /catalogImportIdentity/);
assert.match(contract, /validateCanonicalCatalogImport/);
assert.match(contract, /duplicate_source_key/);
assert.match(contract, /invalid_year_range/);

console.log("Jolcar canonical vehicle catalog foundation contract passed");
