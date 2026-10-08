const assert = require("node:assert/strict"); const fs = require("node:fs"); const path = require("node:path");
const root = path.resolve(__dirname, "..", "..", ".."); const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");
const server = read("apps","web","src","lib","listings","server-write.ts"); const route = read("apps","web","src","app","api","listings","[id]","seller-contact","route.ts");
assert.match(server, /setOwnListingSellerContactPhone/); assert.match(server, /rpc\("set_own_listing_seller_contact_phone"/); assert.match(server, /p_listing_id: listingId/); assert.match(server, /p_seller_contact_phone_id: sellerContactPhoneId/);
assert.match(route, /requireAuthenticatedRequestSupabase/); assert.match(route, /listingContactSwitchSchema/); assert.doesNotMatch(route, /save_own_listing_edit|userId:|sellerId:|phone-verification/); assert.doesNotMatch(server.slice(server.indexOf("setOwnListingSellerContactPhone")), /save_own_listing_edit/);
console.log("listing-contact-switch-boundary: PASS");
