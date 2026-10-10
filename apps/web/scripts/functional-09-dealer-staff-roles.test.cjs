const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261010200000_functional_09_dealer_staff_roles.sql"), "utf8");

for (const expected of [
  "CREATE TYPE marketplace.dealer_staff_role AS ENUM ('owner', 'manager', 'staff')",
  "CREATE TABLE marketplace.dealer_staff_memberships",
  "marketplace.manage_dealer_staff_member",
  "marketplace.remove_dealer_staff_member",
  "dealer owner or manager required",
  "dealer_id = p_dealer_id AND m.user_id = p_user_id",
  "ALTER TABLE marketplace.dealer_staff_memberships ENABLE ROW LEVEL SECURITY",
  "user_id = auth.uid() OR dealer_id = auth.uid()",
  "REVOKE ALL ON TABLE marketplace.dealer_staff_memberships FROM PUBLIC, anon, authenticated"
]) assert.ok(migration.includes(expected), `missing ${expected}`);
assert.doesNotMatch(migration, /GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)[^;]*\bTO\s+(?:anon|authenticated|public)\b/i);
assert.doesNotMatch(migration, /^(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE)\b/im);
console.log("FUNCTIONAL-09 dealer staff roles security contract passed");
