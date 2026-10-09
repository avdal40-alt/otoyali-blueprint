const assert = require("node:assert/strict"); const fs = require("node:fs"); const path = require("node:path");
const root = path.resolve(__dirname, "..", "..", ".."); const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");
const server = read("apps","web","src","lib","listings","server-write.ts"); const route = read("apps","web","src","app","api","listings","[id]","seller-contact","route.ts");
const migration = read("supabase", "migrations", "20261008103000_auth_password_verified_contact_foundation.sql");
const switchFunction = migration.match(/CREATE FUNCTION public\.set_own_listing_seller_contact_phone\([\s\S]*?\n\$\$;/)?.[0] || "";
assert.match(server, /setOwnListingSellerContactPhone/); assert.match(server, /rpc\("set_own_listing_seller_contact_phone"/); assert.match(server, /p_listing_id: listingId/); assert.match(server, /p_seller_contact_phone_id: sellerContactPhoneId/);
assert.match(route, /requireAuthenticatedRequestSupabase/); assert.match(route, /listingContactSwitchSchema/); assert.doesNotMatch(route, /save_own_listing_edit|userId:|sellerId:|phone-verification/); assert.doesNotMatch(server.slice(server.indexOf("setOwnListingSellerContactPhone")), /save_own_listing_edit/);
assert.match(switchFunction, /listing\.archived_at IS NULL/); assert.match(switchFunction, /listing\.status = 'draft' AND listing\.moderation_status = 'draft'/); assert.match(switchFunction, /listing\.status IN \('draft', 'removed'\) AND listing\.moderation_status = 'rejected'/);
console.log("listing-contact-switch-boundary: PASS");
