const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const migration = read(repoRoot, "supabase", "migrations", "20260822120000_security02a_vehicle_ownership_hardening.sql");
const wizard = read(projectRoot, "src", "app", "sell", "_components", "SellWizard.tsx");
const vehicleCore = read(repoRoot, "supabase", "migrations", "20260701120000_vehicle_core_sprint1.sql");

function includesAll(source, values) {
  for (const value of values) assert.ok(source.includes(value), `Expected source to include: ${value}`);
}

includesAll(migration, [
  "DROP POLICY IF EXISTS profile_ownership_insert_own_created_profile",
  "DROP POLICY IF EXISTS profile_ownership_update_own",
  "REVOKE INSERT, UPDATE ON vehicle.profile_ownership FROM authenticated",
  "CREATE OR REPLACE FUNCTION public.initialize_own_vehicle_profile_ownership(",
  "p_vehicle_profile_id UUID",
  "ownership_id UUID",
  "vehicle_profile_id UUID",
  "owner_id UUID",
  "is_current BOOLEAN",
  "started_at TIMESTAMPTZ",
  "ended_at TIMESTAMPTZ",
  "v_user_id UUID := auth.uid()",
  "FROM vehicle.vehicle_profiles AS vp",
  "FOR UPDATE",
  "v_vehicle.created_by <> v_user_id",
  "v_vehicle.profile_status <> 'active'",
  "FROM vehicle.profile_ownership AS po",
  "po.is_current = TRUE",
  "INSERT INTO vehicle.profile_ownership",
  "v_user_id,",
  "WHEN unique_violation",
  "ERRCODE = 'OT404'",
  "SET search_path = pg_catalog, public, vehicle, auth",
  "REVOKE ALL ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) FROM PUBLIC",
  "REVOKE ALL ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) FROM anon",
  "REVOKE ALL ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) FROM service_role",
  "GRANT EXECUTE ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) TO authenticated"
]);

assert.equal((migration.match(/CREATE OR REPLACE FUNCTION public\.initialize_own_vehicle_profile_ownership\(/g) ?? []).length, 1);
assert.equal(migration.includes("p_owner_id"), false, "Caller cannot supply owner_id");
assert.equal(migration.includes("UPDATE vehicle.profile_ownership"), false, "No ownership updater");
assert.equal(migration.includes("DELETE FROM vehicle.profile_ownership"), false, "No ownership deletion");
assert.equal(migration.includes("transfer"), true, "Transfer prohibition is documented in the function comment");

includesAll(wizard, [
  'supabase.rpc("initialize_own_vehicle_profile_ownership"',
  "p_vehicle_profile_id: vehicleProfileId"
]);
assert.equal(wizard.includes('.from("profile_ownership").insert'), false, "Create flow must not directly insert ownership");
assert.equal(wizard.includes("owner_id: userId"), false, "Create flow must not submit owner_id");
for (const field of ["owner_id", "is_current", "started_at", "ended_at"]) {
  assert.equal(wizard.includes(`${field}:`), false, `Create flow must not submit ${field}`);
}

includesAll(vehicleCore, [
  "CREATE UNIQUE INDEX profile_ownership_one_current_owner_idx",
  "WHERE is_current = TRUE"
]);

const rpcStart = wizard.indexOf('supabase.rpc("initialize_own_vehicle_profile_ownership"');
const rpcEnd = wizard.indexOf("});", rpcStart) + 3;
assert.ok(rpcStart >= 0 && rpcEnd > rpcStart, "Ownership RPC call must be complete");
assert.ok(rpcStart < wizard.indexOf("if (ownershipError)", rpcStart), "Create flow must handle RPC errors");

console.log("SECURITY-02A coverage: static source assertions + synthetic shape checks; no PostgreSQL/RPC/RLS execution");
console.log("SECURITY-02A tests passed");
