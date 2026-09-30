const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const migrationsRoot = path.join(repoRoot, "supabase", "migrations");
const migrationName = "20260822120000_security02a_vehicle_ownership_hardening.sql";
const contractMigrationName = "20260825120000_security02f_vehicle_ownership_contract.sql";
const atomicDraftMigrationName = "20260923150000_sell_sec_03a_atomic_draft_media_contract.sql";
const migration = fs.readFileSync(path.join(migrationsRoot, migrationName), "utf8");
const atomicDraftMigration = fs.readFileSync(path.join(migrationsRoot, atomicDraftMigrationName), "utf8");
const wizard = fs.readFileSync(
  path.join(projectRoot, "src", "app", "sell", "_components", "SellWizard.tsx"),
  "utf8"
);
const createRoute = fs.readFileSync(path.join(projectRoot, "src", "app", "api", "listings", "route.ts"), "utf8");
const serverWrite = fs.readFileSync(path.join(projectRoot, "src", "lib", "listings", "server-write.ts"), "utf8");

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
  wizard.includes('listingWriteRequest<{ listingId: string; vehicleProfileId: string }>')
    && wizard.includes('"/api/listings", "POST"'),
  "candidate application must route draft creation through the authenticated server write boundary"
);
assert.match(createRoute, /requireAuthenticatedRequestSupabase/, "the create route must authenticate the request before drafting");
assert.match(createRoute, /createOwnListingDraft\(authenticated, payload\)/, "the create route must delegate the authenticated request to the canonical server-write facade");
assert.match(serverWrite, /export async function createOwnListingDraft/, "the canonical server-write facade must remain present");
assert.match(serverWrite, /authenticated\.supabase\.rpc\("create_own_listing_draft"/, "the canonical server-write facade must invoke the atomic draft initializer");
assert.doesNotMatch(
  wizard,
  /\.from\("(?:listings|vehicle_profiles|profile_ownership)"\)\.(?:insert|update)/,
  "the candidate application must not directly initialize listings, profiles, or ownership"
);
assert.doesNotMatch(
  createRoute,
  /\.from\("(?:listings|vehicle_profiles|profile_ownership)"\)\.(?:insert|update)/,
  "the route must not replace the atomic initializer with direct initialization DML"
);
assert.doesNotMatch(serverWrite, /ownerId\s*:/, "the server-write payload must not accept client-authoritative ownership");
assert.match(atomicDraftMigration, /v_user_id UUID := auth\.uid\(\)/, "the atomic initializer must derive the owner from the authenticated database identity");
assert.match(atomicDraftMigration, /INSERT INTO vehicle\.vehicle_profiles[\s\S]*?INSERT INTO vehicle\.profile_ownership[\s\S]*?INSERT INTO marketplace\.listings/, "the atomic initializer must create profile, ownership, and draft listing together");
assert.match(atomicDraftMigration, /GRANT EXECUTE ON FUNCTION public\.create_own_listing_draft[\s\S]*?TO authenticated;/, "the atomic initializer must be executable only through the authenticated role grant");

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
