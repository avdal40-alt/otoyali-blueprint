const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migration = fs.readFileSync(path.resolve(__dirname, "../../../supabase/migrations/20260912153001_functional_02b2_turkey_condition_trust_declarations.sql"), "utf8");

for (const value of ["'original'", "'painted'", "'replaced'", "'seller'", "'catalog'", "'vin'", "'external_report'", "'ai'"]) {
  assert.ok(migration.includes(value), `missing canonical value ${value}`);
}
assert.match(migration, /CREATE TABLE vehicle\.body_panel_declarations/);
assert.match(migration, /UNIQUE \(vehicle_profile_id, panel\)/);
assert.match(migration, /provenance = 'seller'/);
assert.match(migration, /no_known_damage is not an external Hasarsız verification/);
assert.match(migration, /CREATE TABLE vehicle\.profile_fact_evidence/);
assert.match(migration, /profile_fact_evidence_select_owner/);
assert.doesNotMatch(migration, /GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)[^;]*\bTO\s+(?:anon|public)\b/i);
assert.doesNotMatch(migration, /TRAMER|sbm|external provider/i);
assert.doesNotMatch(migration, /\b(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE|DELETE\s+FROM)\b/i);
console.log("FUNCTIONAL-02B2 trust declaration contract passed");
