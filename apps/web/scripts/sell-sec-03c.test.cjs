const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(repoRoot, "supabase", "migrations", "20260923160000_sell_sec_03c_revoke_legacy_direct_dml.sql"), "utf8");
const wizard = fs.readFileSync(path.join(repoRoot, "apps", "web", "src", "app", "sell", "_components", "SellWizard.tsx"), "utf8");
for (const grant of ["marketplace.listings", "vehicle.vehicle_profiles", "vehicle.profile_ownership", "vehicle.profile_media"]) assert.match(migration, new RegExp(`REVOKE INSERT, UPDATE, DELETE ON ${grant.replace(".", "\\.")} FROM authenticated`));
assert.doesNotMatch(migration, /REVOKE SELECT/i);
assert.doesNotMatch(wizard, /\.from\("(?:listings|vehicle_profiles|profile_media)"\)\s*\.insert/);
assert.doesNotMatch(wizard, /\.rpc\("(?:save_own_rejected_listing|submit_own_listing_for_review|resubmit_own_listing_for_review|set_own_listing_cover_media)"/);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const sql = `SELECT table_schema||'.'||table_name||'|'||has_table_privilege('authenticated',table_schema||'.'||table_name,'SELECT')||'|'||has_table_privilege('authenticated',table_schema||'.'||table_name,'INSERT')||'|'||has_table_privilege('authenticated',table_schema||'.'||table_name,'UPDATE')||'|'||has_table_privilege('authenticated',table_schema||'.'||table_name,'DELETE') FROM information_schema.tables WHERE (table_schema,table_name) IN (('marketplace','listings'),('vehicle','vehicle_profiles'),('vehicle','profile_ownership'),('vehicle','profile_media')) ORDER BY table_schema,table_name;`;
const rows = execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim().split("\n").map((line) => line.split("|"));
assert.equal(rows.length, 4);
for (const [name, select, insert, update, remove] of rows) {
  assert.equal(select, "true", `${name} SELECT remains available`);
  assert.deepEqual([insert, update, remove], ["false", "false", "false"], `${name} direct DML is denied`);
}
console.log("SELL-SEC-03C direct-DML revocation matrix passed");
