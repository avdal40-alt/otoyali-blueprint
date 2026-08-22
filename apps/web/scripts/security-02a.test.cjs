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

function sqlStatements(source, startPattern) {
  const withoutComments = source
    .replace(/--[^\r\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  return withoutComments.match(new RegExp(`\\b${startPattern}\\b[\\s\\S]*?;`, "gi")) ?? [];
}

function policyDetails(statement) {
  const header = statement.split(/\b(?:USING|WITH\s+CHECK)\b/i)[0];
  const operation = header.match(/\bFOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)\b/i)?.[1]?.toUpperCase() ?? "ALL";
  const roleList = header.match(/\bTO\b([\s\S]*)$/i)?.[1] ?? "PUBLIC";
  return {
    operation,
    targetsOwnership: /\bON\s+vehicle\s*\.\s*profile_ownership\b/i.test(header),
    appliesToAuthenticated: /\b(?:authenticated|PUBLIC)\b/i.test(roleList),
    appliesToServiceRole: /\bservice_role\b/i.test(roleList)
  };
}

function authenticatedOwnershipMutationPolicies(source) {
  return sqlStatements(source, "CREATE\\s+POLICY").filter((statement) => {
    const policy = policyDetails(statement);
    return policy.targetsOwnership
      && policy.appliesToAuthenticated
      && ["ALL", "INSERT", "UPDATE", "DELETE"].includes(policy.operation);
  });
}

function authenticatedOwnershipMutationGrants(source) {
  return sqlStatements(source, "GRANT").filter((statement) => {
    if (!/\bON\s+(?:TABLE\s+)?vehicle\s*\.\s*profile_ownership\b/i.test(statement)) return false;
    const privilegeList = statement.match(/^\s*GRANT\s+([\s\S]*?)\bON\b/i)?.[1] ?? "";
    const roleList = statement.match(/\bTO\b([\s\S]*?);\s*$/i)?.[1] ?? "";
    return /\bauthenticated\b/i.test(roleList)
      && /\b(?:ALL(?:\s+PRIVILEGES)?|INSERT|UPDATE|DELETE)\b/i.test(privilegeList);
  });
}

function directOwnershipMutations(source) {
  const mutations = [];
  const ownershipFrom = /\.from\s*\(\s*["'`]profile_ownership["'`]\s*\)/gi;
  for (const match of source.matchAll(ownershipFrom)) {
    const statementEnd = source.indexOf(";", match.index);
    const chain = source.slice(match.index, statementEnd >= 0 ? statementEnd : match.index + 2000);
    const operation = chain.match(/\.\s*(insert|update|delete|upsert)\s*\(/i)?.[1];
    if (operation) mutations.push(operation.toLowerCase());
  }
  return mutations;
}

function sourceFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(fullPath));
    else if (/\.(?:c|m)?(?:j|t)sx?$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function isClearlyServerOnly(filePath, source) {
  const normalizedPath = filePath.split(path.sep).join("/");
  return normalizedPath.includes("/app/api/")
    || normalizedPath.includes("/server/")
    || /(?:import|require\s*\()\s*["']server-only["']/.test(source);
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
assert.deepEqual(
  authenticatedOwnershipMutationPolicies(migration),
  [],
  "Migration must not create any authenticated ownership INSERT, UPDATE, DELETE, or ALL policy"
);
assert.deepEqual(
  authenticatedOwnershipMutationGrants(migration),
  [],
  "Migration must not grant authenticated ownership INSERT, UPDATE, DELETE, or ALL privileges"
);

const coreOwnershipPolicies = sqlStatements(vehicleCore, "CREATE\\s+POLICY")
  .filter((statement) => policyDetails(statement).targetsOwnership);
assert.equal(
  coreOwnershipPolicies.filter((statement) => {
    const policy = policyDetails(statement);
    return policy.operation === "SELECT"
      && policy.appliesToAuthenticated
      && /\bUSING\s*\(\s*owner_id\s*=\s*auth\.uid\(\)\s*\)/i.test(statement);
  }).length,
  1,
  "Established authenticated own-row SELECT policy must remain present"
);
assert.equal(
  coreOwnershipPolicies.filter((statement) => {
    const policy = policyDetails(statement);
    return policy.operation === "ALL" && policy.appliesToServiceRole && !policy.appliesToAuthenticated;
  }).length,
  1,
  "Service-role ownership policy must remain unaffected"
);

for (const operation of ["INSERT", "UPDATE", "DELETE", "ALL"]) {
  const syntheticPolicy = `
    CREATE POLICY arbitrary_${operation.toLowerCase()}_name
      ON vehicle.profile_ownership
      FOR ${operation}
      TO authenticated
      USING (TRUE);
  `;
  assert.equal(
    authenticatedOwnershipMutationPolicies(syntheticPolicy).length,
    1,
    `Policy detector must reject multiline authenticated FOR ${operation}`
  );

  const syntheticGrant = `GRANT ${operation} ON vehicle.profile_ownership TO authenticated;`;
  assert.equal(
    authenticatedOwnershipMutationGrants(syntheticGrant).length,
    1,
    `Grant detector must reject authenticated GRANT ${operation}`
  );
}
assert.deepEqual(
  authenticatedOwnershipMutationPolicies("CREATE POLICY own_read ON vehicle.profile_ownership FOR SELECT TO authenticated USING (owner_id = auth.uid());"),
  [],
  "Policy detector must allow authenticated SELECT"
);
assert.deepEqual(
  authenticatedOwnershipMutationPolicies("CREATE POLICY trusted_all ON vehicle.profile_ownership FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);"),
  [],
  "Policy detector must allow service_role FOR ALL"
);
assert.deepEqual(
  authenticatedOwnershipMutationGrants("GRANT SELECT ON vehicle.profile_ownership TO authenticated; GRANT EXECUTE ON FUNCTION public.example(UUID) TO authenticated;"),
  [],
  "Grant detector must allow ownership SELECT and RPC EXECUTE"
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

const browserOwnershipMutations = [];
for (const filePath of sourceFiles(path.join(projectRoot, "src"))) {
  const source = read(filePath);
  if (isClearlyServerOnly(filePath, source)) continue;
  for (const operation of directOwnershipMutations(source)) {
    browserOwnershipMutations.push(`${path.relative(projectRoot, filePath)}: ${operation}`);
  }
}
assert.deepEqual(
  browserOwnershipMutations,
  [],
  "Web source must not directly insert, update, delete, or upsert profile_ownership"
);
for (const operation of ["insert", "update", "delete", "upsert"]) {
  assert.deepEqual(
    directOwnershipMutations(`supabase\n  .from("profile_ownership")\n  .${operation}({ owner_id: userId });`),
    [operation],
    `Browser mutation detector must reject multiline .${operation}()`
  );
}
assert.deepEqual(
  directOwnershipMutations('supabase.from("profile_ownership").select("id");'),
  [],
  "Browser mutation detector must allow ownership reads"
);

includesAll(vehicleCore, [
  "CREATE UNIQUE INDEX profile_ownership_one_current_owner_idx",
  "WHERE is_current = TRUE"
]);

const rpcStart = wizard.indexOf('supabase.rpc("initialize_own_vehicle_profile_ownership"');
const rpcEnd = wizard.indexOf("});", rpcStart) + 3;
assert.ok(rpcStart >= 0 && rpcEnd > rpcStart, "Ownership RPC call must be complete");
assert.ok(rpcStart < wizard.indexOf("if (ownershipError)", rpcStart), "Create flow must handle RPC errors");

console.log("SECURITY-02A coverage: static source assertions + synthetic shape checks; no PostgreSQL compilation/execution, catalog ACL verification, RPC/RLS execution, concurrency, or cross-user runtime authorization");
console.log("SECURITY-02A tests passed");
