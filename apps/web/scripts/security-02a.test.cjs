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

function normalizeSqlIdentifiers(source) {
  return source.replace(/"([a-z_][a-z0-9_$]*)"/g, "$1");
}

function sqlStatements(source, startPattern) {
  const normalized = normalizeSqlIdentifiers(source)
    .replace(/--[^\r\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  return normalized.match(new RegExp(`\\b${startPattern}\\b[\\s\\S]*?;`, "gi")) ?? [];
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
    const targetsOwnership = /\bON\s+(?:TABLE\s+)?vehicle\s*\.\s*profile_ownership\b/i.test(statement);
    const targetsAllVehicleTables = /\bON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+vehicle\b/i.test(statement);
    if (!targetsOwnership && !targetsAllVehicleTables) return false;
    const privilegeList = statement.match(/^\s*GRANT\s+([\s\S]*?)\bON\b/i)?.[1] ?? "";
    const roleList = statement.match(/\bTO\b([\s\S]*?);\s*$/i)?.[1] ?? "";
    return /\b(?:authenticated|PUBLIC)\b/i.test(roleList)
      && /\b(?:ALL(?:\s+PRIVILEGES)?|INSERT|UPDATE|DELETE)\b/i.test(privilegeList);
  });
}

function authenticatedVehicleDefaultMutationGrants(source) {
  return sqlStatements(source, "ALTER\\s+DEFAULT\\s+PRIVILEGES").filter((statement) => {
    const schemaList = statement.match(/\bIN\s+SCHEMA\s+([\s\S]*?)\bGRANT\b/i)?.[1];
    const appliesToVehicle = schemaList === undefined || /\bvehicle\b/i.test(schemaList);
    const privilegeList = statement.match(/\bGRANT\s+([\s\S]*?)\bON\s+TABLES\b/i)?.[1] ?? "";
    const roleList = statement.match(/\bTO\b([\s\S]*?);\s*$/i)?.[1] ?? "";
    return appliesToVehicle
      && /\b(?:authenticated|PUBLIC)\b/i.test(roleList)
      && /\b(?:ALL(?:\s+PRIVILEGES)?|INSERT|UPDATE|DELETE)\b/i.test(privilegeList);
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function directOwnershipMutations(source) {
  const mutations = [];
  const ownershipConstants = [...source.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=;]+)?\s*=\s*["'`]profile_ownership["'`](?:\s+as\s+const)?\s*;/g)]
    .map((match) => match[1]);
  const tableArgument = ["[\\\"'`]profile_ownership[\\\"'`]", ...ownershipConstants.map(escapeRegExp)].join("|");
  const ownershipFrom = new RegExp(`\\.from\\s*\\(\\s*(?:${tableArgument})\\s*\\)`, "gi");
  for (const match of source.matchAll(ownershipFrom)) {
    const statementEnd = source.indexOf(";", match.index);
    const chain = source.slice(match.index, statementEnd >= 0 ? statementEnd : match.index + 2000);
    const operation = chain.match(/\.\s*(insert|update|delete|upsert)\s*\(/i)?.[1];
    if (operation) mutations.push(operation.toLowerCase());
  }

  const ownershipAlias = new RegExp(
    `\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)(?:\\s*:\\s*[^=;]+)?\\s*=\\s*[^;]*?\\.from\\s*\\(\\s*(?:${tableArgument})\\s*\\)[^;]*(?:;|$)`,
    "gi"
  );
  for (const match of source.matchAll(ownershipAlias)) {
    const alias = escapeRegExp(match[1]);
    const aliasMutation = new RegExp(`\\b${alias}\\s*(?:\\?\\.|\\.)\\s*(insert|update|delete|upsert)\\s*\\(`, "gi");
    for (const operation of source.slice(match.index + match[0].length).matchAll(aliasMutation)) {
      mutations.push(operation[1].toLowerCase());
    }
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
  "CREATE POLICY profile_ownership_insert_own_created_profile",
  "owner_id = auth.uid()",
  "ownership_type = 'owner'",
  "is_current IS TRUE",
  "ended_at IS NULL",
  "vp.created_by = auth.uid()",
  "vp.profile_status = 'active'",
  "GRANT INSERT (vehicle_profile_id, owner_id, ownership_type, is_current)",
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
  /GRANT\s+[^;]*(?:UPDATE|DELETE|ALL)[^;]*ON\s+vehicle\.profile_ownership\s+TO\s+authenticated/i.test(migration),
  false,
  "EXPAND migration must not restore authenticated ownership UPDATE, DELETE, or ALL privileges"
);
const expandMutationPolicies = authenticatedOwnershipMutationPolicies(migration);
assert.equal(expandMutationPolicies.length, 1, "EXPAND must retain exactly one authenticated ownership mutation policy");
assert.equal(policyDetails(expandMutationPolicies[0]).operation, "INSERT", "Only legacy INSERT may remain during EXPAND");
includesAll(expandMutationPolicies[0], [
  "owner_id = auth.uid()",
  "ownership_type = 'owner'",
  "is_current IS TRUE",
  "ended_at IS NULL",
  "vp.created_by = auth.uid()",
  "vp.profile_status = 'active'"
]);
assert.deepEqual(
  authenticatedOwnershipMutationPolicies(migration)
    .filter((statement) => ["ALL", "UPDATE", "DELETE"].includes(policyDetails(statement).operation)),
  [],
  "EXPAND must not create authenticated ownership UPDATE, DELETE, or ALL policies"
);
const expandMutationGrants = authenticatedOwnershipMutationGrants(migration);
assert.equal(expandMutationGrants.length, 1, "EXPAND must retain exactly one authenticated ownership mutation grant");
assert.match(
  expandMutationGrants[0],
  /^\s*GRANT\s+INSERT\s*\(\s*vehicle_profile_id\s*,\s*owner_id\s*,\s*ownership_type\s*,\s*is_current\s*\)\s+ON\s+vehicle\.profile_ownership\s+TO\s+authenticated\s*;/i,
  "Legacy INSERT must be column-scoped to the exact old-client payload"
);
assert.deepEqual(
  authenticatedVehicleDefaultMutationGrants(migration),
  [],
  "Migration must not default-grant authenticated vehicle-table mutation privileges"
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
for (const target of ['"vehicle" . "profile_ownership"', 'vehicle . "profile_ownership"', '"vehicle" . profile_ownership']) {
  assert.equal(
    authenticatedOwnershipMutationPolicies(`CREATE POLICY "renamed mutation policy" ON ${target} FOR INSERT TO PUBLIC WITH CHECK (TRUE);`).length,
    1,
    `Policy detector must reject PUBLIC mutation policies on quoted target ${target}`
  );
}
assert.equal(
  authenticatedOwnershipMutationGrants('GRANT ALL PRIVILEGES ON "vehicle" . "profile_ownership" TO authenticated;').length,
  1,
  "Grant detector must reject explicit ALL PRIVILEGES with a quoted ownership target"
);
assert.equal(
  authenticatedOwnershipMutationGrants("GRANT SELECT, INSERT, UPDATE, DELETE ON vehicle.profile_ownership TO authenticated;").length,
  1,
  "Grant detector must reject combined authenticated mutation privileges"
);
for (const statement of [
  "GRANT ALL ON ALL TABLES IN SCHEMA vehicle TO authenticated;",
  "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA vehicle TO authenticated;",
  "GRANT INSERT, UPDATE, DELETE\nON ALL TABLES IN SCHEMA vehicle\nTO authenticated;",
  'GRANT UPDATE ON ALL TABLES IN SCHEMA "vehicle" TO PUBLIC;'
]) {
  assert.equal(
    authenticatedOwnershipMutationGrants(statement).length,
    1,
    `Grant detector must reject vehicle-schema mutation grant: ${statement}`
  );
}
for (const statement of [
  "ALTER DEFAULT PRIVILEGES IN SCHEMA vehicle GRANT ALL ON TABLES TO authenticated;",
  'ALTER DEFAULT PRIVILEGES IN SCHEMA "vehicle" GRANT INSERT, UPDATE ON TABLES TO PUBLIC;',
  "ALTER DEFAULT PRIVILEGES GRANT DELETE ON TABLES TO authenticated;"
]) {
  assert.equal(
    authenticatedVehicleDefaultMutationGrants(statement).length,
    1,
    `Default-privilege detector must reject vehicle-table mutation grant: ${statement}`
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
assert.deepEqual(
  authenticatedOwnershipMutationGrants("GRANT ALL ON vehicle.profile_ownership TO service_role; GRANT USAGE ON SCHEMA vehicle TO authenticated;"),
  [],
  "Grant detector must allow service_role table access and authenticated schema USAGE"
);
assert.deepEqual(
  authenticatedVehicleDefaultMutationGrants("ALTER DEFAULT PRIVILEGES IN SCHEMA marketplace GRANT ALL ON TABLES TO authenticated;"),
  [],
  "Default-privilege detector must ignore unrelated schemas"
);
for (const statement of [
  "REVOKE UPDATE ON vehicle.profile_ownership FROM authenticated; GRANT UPDATE ON vehicle.profile_ownership TO authenticated;",
  "GRANT UPDATE ON vehicle.profile_ownership TO authenticated; REVOKE UPDATE ON vehicle.profile_ownership FROM authenticated;"
]) {
  assert.equal(
    authenticatedOwnershipMutationGrants(statement).length,
    1,
    "Grant detector must intentionally reject dangerous grants regardless of REVOKE ordering"
  );
}

// Intentionally stricter than effective-state modeling: any dangerous GRANT in
// this migration fails even when a later REVOKE would make the final state safe.

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
for (const operation of ["insert", "update", "delete", "upsert"]) {
  assert.deepEqual(
    directOwnershipMutations(`const ownership = supabase.schema("vehicle").from("profile_ownership");\nownership.${operation}({ owner_id: userId });`),
    [operation],
    `Browser mutation detector must reject ownership query-alias .${operation}()`
  );
}
for (const operation of ["insert", "update"]) {
  assert.deepEqual(
    directOwnershipMutations(`const OWNERSHIP_TABLE: string = "profile_ownership" as const;\nconst ownership: unknown = supabase.from(OWNERSHIP_TABLE);\nownership.${operation}({ owner_id: userId });`),
    [operation],
    `Browser mutation detector must reject constant-table alias .${operation}()`
  );
}
assert.deepEqual(
  directOwnershipMutations('supabase.from("profile_ownership").select("id");'),
  [],
  "Browser mutation detector must allow ownership reads"
);
assert.deepEqual(
  directOwnershipMutations('supabase.from("other_table").insert({ value: true });'),
  [],
  "Browser mutation detector must allow unrelated-table mutations"
);

includesAll(vehicleCore, [
  "CREATE UNIQUE INDEX profile_ownership_one_current_owner_idx",
  "WHERE is_current = TRUE"
]);

const rpcStart = wizard.indexOf('supabase.rpc("initialize_own_vehicle_profile_ownership"');
const rpcEnd = wizard.indexOf("});", rpcStart) + 3;
assert.ok(rpcStart >= 0 && rpcEnd > rpcStart, "Ownership RPC call must be complete");
assert.ok(rpcStart < wizard.indexOf("if (ownershipError)", rpcStart), "Create flow must handle RPC errors");

console.log("SECURITY-02A EXPAND coverage: secure initializer RPC; temporary constrained legacy INSERT; no authenticated direct UPDATE/DELETE");
console.log("SECURITY-02A remains the immutable EXPAND stage; SECURITY-02F separately validates the final CONTRACT state");
console.log("SECURITY-02A source coverage does not replace PostgreSQL compilation, catalog ACL, RLS/RPC, concurrency, or cross-user runtime validation");
console.log("SECURITY-02A grant checks intentionally reject any dangerous source GRANT regardless of a later REVOKE");
console.log("SECURITY-02A browser checks cover direct chains, simple local table constants, and local query aliases; they are not general JavaScript data-flow analysis");
console.log("SECURITY-02A tests passed");
