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
  "REVOKE INSERT, UPDATE, DELETE ON vehicle.profile_ownership FROM authenticated",
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
  "INSERT INTO vehicle.profile_ownership AS inserted_ownership",
  "v_user_id,",
  "WHEN unique_violation",
  "ERRCODE = 'OT404'",
  "SET search_path = pg_catalog",
  "REVOKE ALL ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) FROM PUBLIC",
  "REVOKE ALL ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) FROM anon",
  "REVOKE ALL ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) FROM service_role",
  "REVOKE ALL ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) FROM authenticated",
  "GRANT EXECUTE ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) TO authenticated"
]);

assert.equal((migration.match(/CREATE OR REPLACE FUNCTION public\.initialize_own_vehicle_profile_ownership\(/g) ?? []).length, 1);
assert.match(
  migration,
  /CREATE OR REPLACE FUNCTION public\.initialize_own_vehicle_profile_ownership\(\s*p_vehicle_profile_id UUID\s*\)/,
  "RPC signature must remain exactly one UUID input"
);
assert.match(
  migration,
  /RETURNS TABLE \(\s*ownership_id UUID,\s*vehicle_profile_id UUID,\s*owner_id UUID,\s*is_current BOOLEAN,\s*started_at TIMESTAMPTZ,\s*ended_at TIMESTAMPTZ\s*\)/,
  "RPC return-column names and order must remain stable"
);
assert.equal(migration.includes("p_owner_id"), false, "Caller cannot supply owner_id");
assert.equal(migration.includes("UPDATE vehicle.profile_ownership"), false, "No ownership updater");
assert.equal(migration.includes("DELETE FROM vehicle.profile_ownership"), false, "No ownership deletion");
assert.equal(migration.includes("transfer"), true, "Transfer prohibition is documented in the function comment");
assert.equal(
  /GRANT\s+[^;]*(?:INSERT|UPDATE|DELETE|ALL)[^;]*ON\s+vehicle\.profile_ownership\s+TO\s+authenticated/i.test(migration),
  false,
  "Migration must not restore authenticated ownership mutation privileges"
);

const insertStart = migration.indexOf("INSERT INTO vehicle.profile_ownership AS inserted_ownership");
const returningStart = migration.indexOf("RETURNING", insertStart);
const returningEnd = migration.indexOf(";", returningStart);
assert.ok(insertStart >= 0 && returningStart > insertStart && returningEnd > returningStart, "Aliased ownership INSERT must have RETURNING");
const returningClause = migration.slice(returningStart, returningEnd).replace(/\s+/g, " ").trim();
assert.equal(
  returningClause,
  "RETURNING inserted_ownership.id, inserted_ownership.vehicle_profile_id, inserted_ownership.owner_id, inserted_ownership.is_current, inserted_ownership.started_at, inserted_ownership.ended_at",
  "Every returned ownership column must be explicitly qualified by the INSERT target alias"
);
for (const column of ["id", "vehicle_profile_id", "owner_id", "is_current", "started_at", "ended_at"]) {
  const bareColumn = new RegExp(`(^|[^.\\w])${column}\\b`);
  assert.equal(bareColumn.test(returningClause), false, `RETURNING must not contain bare ${column}`);
}

const postgresCompilationExecuted = false;
assert.equal(postgresCompilationExecuted, false, "Source assertions do not prove PostgreSQL function compilation or execution");

includesAll(wizard, [
  'supabase.rpc("initialize_own_vehicle_profile_ownership"',
  "p_vehicle_profile_id: vehicleProfileId"
]);
assert.equal(wizard.includes('.from("profile_ownership").insert'), false, "Create flow must not directly insert ownership");
assert.equal(wizard.includes('.from("profile_ownership").update'), false, "Create flow must not directly update ownership");
assert.equal(wizard.includes('.from("profile_ownership").delete'), false, "Create flow must not directly delete ownership");
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
