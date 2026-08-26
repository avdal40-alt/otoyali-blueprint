const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(
  path.join(repoRoot, "supabase", "migrations", "20260827122000_security_final_vehicle_identity.sql"),
  "utf8"
);

assert.match(migration, /REVOKE UPDATE ON vehicle\.vehicle_profiles FROM authenticated/);
assert.match(migration, /GRANT UPDATE \([\s\S]*?owner_count[\s\S]*?\) ON vehicle\.vehicle_profiles TO authenticated/);
for (const protectedColumn of ["id", "created_by", "created_source", "profile_status", "created_at", "updated_at"]) {
  const grant = migration.match(/GRANT UPDATE \(([\s\S]*?)\) ON vehicle\.vehicle_profiles TO authenticated/);
  assert.ok(grant, "editable vehicle column grant must exist");
  assert.doesNotMatch(grant[1], new RegExp(`\\b${protectedColumn}\\b`), `${protectedColumn} must not be client-updatable`);
}
assert.match(migration, /created_by = auth\.uid\(\)/);
assert.match(migration, /created_source = 'manual'/);
assert.match(migration, /profile_status = 'active'/);

console.log("SECURITY-FINAL vehicle identity contract passed");
