const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, randomUUID } = require("node:crypto");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261002193544_sell_sec_04b2_verified_seller_contact_source.sql"), "utf8");
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_listing_seller_contact/);
assert.match(migration, /identity\.seller_phone_verifications AS verification/);
assert.doesNotMatch(migration, /public\.profiles AS seller|seller\.phone/);
assert.match(migration, /listing\.seller_id <> v_user_id/);
assert.match(migration, /SET search_path = ''/);
console.log("PASS SELL-SEC-04B2 source contract");
