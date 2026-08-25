const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const migrationsRoot = path.join(repoRoot, "supabase", "migrations");
const migrationName = "20260822120000_security02a_vehicle_ownership_hardening.sql";
const contractMigrationName = "20260825120000_security02f_vehicle_ownership_contract.sql";
const migration = fs.readFileSync(path.join(migrationsRoot, migrationName), "utf8");
const wizard = fs.readFileSync(
  path.join(projectRoot, "src", "app", "sell", "_components", "SellWizard.tsx"),
  "utf8"
);

const legacyPayloadColumns = ["vehicle_profile_id", "owner_id", "ownership_type", "is_current"];
const columnGrant = migration.match(
  /GRANT\s+INSERT\s*\(([^)]*)\)\s+ON\s+vehicle\.profile_ownership\s+TO\s+authenticated\s*;/i
);
assert.ok(columnGrant, "old app + expanded DB requires a temporary authenticated column-scoped INSERT grant");
assert.deepEqual(
  columnGrant[1].split(",").map((column) => column.trim()),
  legacyPayloadColumns,
  "EXPAND grant must match the exact origin/main ownership INSERT payload"
);

const policyStart = migration.indexOf("CREATE POLICY profile_ownership_insert_own_created_profile");
const rpcStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.initialize_own_vehicle_profile_ownership(");
assert.ok(policyStart >= 0, "old app + expanded DB requires the temporary legacy INSERT policy");
assert.ok(rpcStart > policyStart, "new app + expanded DB requires the initializer RPC in the same EXPAND migration");
assert.ok(
  migration.lastIndexOf("REVOKE INSERT, UPDATE, DELETE ON vehicle.profile_ownership FROM authenticated") < policyStart,
  "the baseline revoke must be followed by the temporary legacy INSERT capability"
);
assert.ok(
  migration.includes("GRANT EXECUTE ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) TO authenticated"),
  "candidate clients must retain authenticated initializer execution"
);
assert.ok(
  wizard.includes('supabase.rpc("initialize_own_vehicle_profile_ownership"'),
  "candidate application must use the new initializer path"
);

const laterMigrations = fs.readdirSync(migrationsRoot)
  .filter((name) => name.endsWith(".sql") && name > migrationName)
  .sort();
assert.equal(
  laterMigrations[0],
  contractMigrationName,
  "SECURITY-02A must remain a distinct EXPAND stage immediately followed by its CONTRACT migration"
);

console.log("SECURITY-02E release compatibility passed: old app + expanded DB and new app + expanded DB contracts coexist");
console.log("SECURITY-02E preserves the historical EXPAND stage; SECURITY-02F validates the later CONTRACT transition");
