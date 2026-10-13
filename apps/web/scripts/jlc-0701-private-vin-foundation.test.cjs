const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const migration = fs.readFileSync(path.resolve(__dirname, "../../../supabase/migrations/20260912153002_functional_02b3_private_vin_foundation.sql"), "utf8");

for (const fragment of [
  "CREATE TABLE vehicle.private_vins",
  "normalized_vin CHAR(17) NOT NULL",
  "vin_fingerprint BYTEA NOT NULL UNIQUE",
  "ENABLE ROW LEVEL SECURITY",
  "private_vins_service_role_all",
  "IF auth.uid() IS NULL OR NOT vehicle.is_current_profile_owner",
  "RETURN QUERY SELECT 'review_required'::TEXT, NULL::TEXT",
  "REVOKE ALL ON FUNCTION vehicle.submit_own_vin(UUID, TEXT) FROM PUBLIC",
  "GRANT EXECUTE ON FUNCTION vehicle.submit_own_vin(UUID, TEXT) TO authenticated"
]) assert.match(migration, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

assert.doesNotMatch(migration, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)[^;]*\bTO\s+(?:anon|authenticated|public)\b/i);

const sql = [
  "SELECT has_table_privilege('anon', 'vehicle.private_vins', 'SELECT'), has_table_privilege('authenticated', 'vehicle.private_vins', 'SELECT'), has_table_privilege('service_role', 'vehicle.private_vins', 'SELECT'), (SELECT relrowsecurity FROM pg_class WHERE oid = 'vehicle.private_vins'::regclass);",
  "SELECT has_function_privilege('anon', 'vehicle.submit_own_vin(uuid,text)', 'EXECUTE'), has_function_privilege('authenticated', 'vehicle.submit_own_vin(uuid,text)', 'EXECUTE');",
  "SELECT count(*) FROM pg_views WHERE schemaname IN ('public', 'marketplace') AND definition ILIKE '%private_vins%';"
].join(" ");

const output = execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-Atc", sql], { encoding: "utf8" }).trim().split(/\r?\n/);
assert.deepEqual(output, ["f|f|t|t", "f|t", "0"]);

console.log("JLC-0701 private VIN optionality and owner/admin privacy boundaries passed");
