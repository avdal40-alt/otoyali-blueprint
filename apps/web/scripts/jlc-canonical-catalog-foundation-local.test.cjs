const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const database = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...database, sql], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
const ids = Object.fromEntries(["dataset", "make", "model", "generation", "modification"].map((key) => [key, randomUUID()]));
const prefix = `catalog-${ids.dataset.slice(0, 8)}`;

const output = query(`
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO vehicle.catalog_datasets (id, source_name, source_version, content_sha256)
VALUES ('${ids.dataset}', 'fixture-source', '${prefix}', repeat('a', 64));
INSERT INTO vehicle.makes (id, name, slug, catalog_origin, catalog_dataset_id, catalog_source_key)
VALUES ('${ids.make}', 'Catalog Fixture Make', '${prefix}-make', 'imported', '${ids.dataset}', 'make-1');
INSERT INTO vehicle.models (id, make_id, name, slug, catalog_origin, catalog_dataset_id, catalog_source_key)
VALUES ('${ids.model}', '${ids.make}', 'Catalog Fixture Model', '${prefix}-model', 'imported', '${ids.dataset}', 'model-1');
INSERT INTO vehicle.generations (id, model_id, name, slug, production_year_start, production_year_end, catalog_origin, catalog_dataset_id, catalog_source_key)
VALUES ('${ids.generation}', '${ids.model}', 'Catalog Fixture Generation', '${prefix}-generation', 2020, 2024, 'imported', '${ids.dataset}', 'generation-1');
INSERT INTO vehicle.modifications (id, generation_id, name, slug, catalog_origin, catalog_dataset_id, catalog_source_key)
VALUES ('${ids.modification}', '${ids.generation}', 'Catalog Fixture Modification', '${prefix}-modification', 'imported', '${ids.dataset}', 'modification-1');
INSERT INTO vehicle.catalog_specifications (modification_id, specification_code, value_number, unit_code, catalog_origin, catalog_dataset_id, catalog_source_key)
VALUES ('${ids.modification}', 'power_kw', 110, 'kw', 'imported', '${ids.dataset}', 'spec-power-1');
SELECT g.production_year_start || '-' || g.production_year_end || '|' || s.specification_code || '|' || s.value_number
FROM vehicle.generations g JOIN vehicle.modifications m ON m.generation_id = g.id JOIN vehicle.catalog_specifications s ON s.modification_id = m.id
WHERE g.id = '${ids.generation}';
SET LOCAL ROLE anon;
SELECT count(*) FROM vehicle.catalog_specifications WHERE modification_id = '${ids.modification}';
RESET ROLE;
SELECT has_table_privilege('anon', 'vehicle.catalog_datasets', 'SELECT') || '|' || has_table_privilege('authenticated', 'vehicle.catalog_market_overrides', 'SELECT') || '|' || has_table_privilege('anon', 'vehicle.catalog_specifications', 'SELECT');
SELECT relrowsecurity FROM pg_class WHERE oid = 'vehicle.catalog_specifications'::regclass;
ROLLBACK;
`);

assert.ok(output.includes("2020-2024|power_kw|110"), "canonical modification specifications must retain their generation boundary");
assert.ok(output.includes("1"), "active canonical specifications must be public-readable through RLS");
assert.ok(output.includes("false|false|true"), "only intended public catalog specifications receive SELECT grants");
assert.ok(output.includes("t"), "catalog specifications must have RLS enabled");

const duplicateIndexes = query(`
SELECT indexrelid::regclass::text
FROM pg_index
WHERE indexrelid IN (
  'vehicle.makes_catalog_dataset_source_key_unique_idx'::regclass,
  'vehicle.generations_catalog_dataset_source_key_unique_idx'::regclass,
  'vehicle.modifications_catalog_dataset_source_key_unique_idx'::regclass
)
ORDER BY 1;
`);
assert.equal(duplicateIndexes.length, 3, "import source keys must have database-backed duplicate protection");
console.log("Jolcar canonical vehicle catalog foundation local integrity and RLS passed");
