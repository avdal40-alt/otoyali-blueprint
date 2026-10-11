const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20261011170000_jlc0908_harden_dealer_staff_authorization.sql"),
  "utf8"
);

for (const expected of [
  "membership absence must never imply dealer ownership",
  "v_actor_is_owner := v_actor = p_dealer_id",
  "IS DISTINCT FROM 'manager'::marketplace.dealer_staff_role",
  "managers may manage staff role only",
  "managers may remove staff role only",
  "p_user_id = auth.uid() OR auth.uid() = p_dealer_id",
  "REPLACE FUNCTION marketplace.manage_dealer_staff_member",
  "REPLACE FUNCTION marketplace.remove_dealer_staff_member"
]) {
  assert.ok(migration.includes(expected), `missing ${expected}`);
}

assert.doesNotMatch(migration, /COALESCE\s*\([^;]*,\s*'owner'\)/i);
assert.doesNotMatch(migration, /^(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE)\b/im);
console.log("JLC-0908 dealer staff authorization contract passed");
