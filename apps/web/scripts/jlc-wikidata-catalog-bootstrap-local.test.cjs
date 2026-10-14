const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { counts, importLocal, loadSnapshot } = require("./jlc-wikidata-catalog-bootstrap.cjs");

const query = (sql) => execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At", "-c", sql], { encoding: "utf8" }).trim();
const snapshot = loadSnapshot();
const baseline = counts();
const first = importLocal(snapshot).counts;
const second = importLocal(snapshot).counts;
assert.deepEqual(first, second, "the exact same approved package must be idempotent");
assert.ok(first.generations >= baseline.generations, "local import must not remove canonical generations");
assert.equal(query("SELECT count(*) FROM vehicle.generations g LEFT JOIN vehicle.models mo ON mo.id = g.model_id LEFT JOIN vehicle.makes ma ON ma.id = mo.make_id WHERE g.catalog_origin = 'imported' AND (mo.id IS NULL OR ma.id IS NULL);"), "0", "imported generations must retain canonical model/make parents");
assert.equal(query("SELECT count(*) FROM vehicle.generations WHERE catalog_origin = 'imported' AND (catalog_dataset_id IS NULL OR catalog_source_key IS NULL OR catalog_revision < 1);"), "0", "imported generations must retain provenance");
assert.equal(query("SELECT count(*) FROM vehicle.generations WHERE production_year_start IS NOT NULL AND (production_year_end IS NULL OR production_year_start > production_year_end OR production_year_start < 1886);"), "0", "generation years must satisfy canonical constraints");
assert.equal(query("SELECT count(*) FROM (SELECT catalog_dataset_id, catalog_source_key FROM vehicle.generations WHERE catalog_dataset_id IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1) duplicates;"), "0", "dataset/source keys must remain unique");
assert.equal(query("SELECT count(*) FROM vehicle.catalog_datasets WHERE source_name = 'wikidata' AND source_version = 'wikidata-camry-generations-v1' AND content_sha256 = '5486a543ecb0e08ba9b47a434ed896f6588409d9b6636d34be5adb8e74c5c380' AND metadata->>'extractionVersion' = 'wikidata-camry-generations-v1';"), "1", "dataset provenance/version metadata must be registered exactly once");
console.log("Jolcar Wikidata catalog local import idempotency, provenance, and referential integrity passed");
