const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const migrations = fs.readdirSync(path.join(root, "supabase/migrations"));
const name = migrations.find((file) => /_jlc_0520_admin_helper_self_scope\.sql$/.test(file));
assert.ok(name, "JLC-0520 self-scope migration must exist");
const migration = fs.readFileSync(path.join(root, "supabase/migrations", name), "utf8");

for (const helper of ["is_admin", "admin_role"]) {
  assert.match(migration, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${helper}\\(uid UUID\\)[\\s\\S]*?uid = auth\\.uid\\(\\) OR auth\\.role\\(\\) = 'service_role'`));
}
assert.match(migration, /SET search_path = public/);
assert.doesNotMatch(migration, /REVOKE .*EXECUTE/i, "anon EXECUTE remains necessary for RLS helper calls");

assert.doesNotMatch(migration, /DROP FUNCTION|ALTER TABLE|TRUNCATE|DELETE FROM/i,
  "helper hardening must preserve function signatures and all data");
assert.match(migration, /BEGIN;[\s\S]*COMMIT;/);

console.log("JLC-0520 caller-scoped admin-helper migration contract passed.");
