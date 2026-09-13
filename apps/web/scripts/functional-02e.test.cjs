const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260913113000_functional_02e_sell_edit_vehicle_trust_contract.sql"), "utf8");
const contract = fs.readFileSync(path.join(root, "apps/web/src/lib/marketplace/vehicle-trust-contract.ts"), "utf8");

for (const expected of [
  "save_own_listing_vehicle_trust_contract", "auth.uid()", "FOR UPDATE",
  "vehicle.is_current_profile_owner", "p_trade_in_accepted", "p_seller_damage_declaration",
  "p_seller_service_declaration", "p_body_panels", "body_panel_declarations",
  "profile_fact_evidence", "provenance = 'seller'", "REVOKE ALL ON FUNCTION",
  "GRANT EXECUTE ON FUNCTION public.save_own_listing_vehicle_trust_contract"
]) assert.ok(migration.includes(expected), expected);
assert.doesNotMatch(migration, /GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)[^;]*\bTO\s+(?:anon|public)\b/i);
assert.doesNotMatch(migration, /\b(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE|DELETE\s+FROM\s+marketplace\.listings)\b/i);
for (const value of ["front_bumper", "original", "painted", "replaced", "no_known_damage", "regular_service_declared"]) {
  assert.ok(contract.includes(value), `contract value ${value}`);
}
console.log("FUNCTIONAL-02E sell/edit vehicle and trust contract passed");
