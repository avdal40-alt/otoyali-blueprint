const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
const route = read("src", "app", "api", "listing", "contact", "route.ts");
const button = read("src", "app", "listing", "[id]", "_components", "ContactSellerButton.tsx");
const page = read("src", "app", "listing", "[id]", "page.tsx");
const authReturn = read("scripts", "auth-return-path.test.cjs");
const listingQueries = read("src", "lib", "queries", "listings.ts");

for (const expected of [
  'supabase.auth.getUser()',
  'supabase.rpc("get_listing_seller_contact"',
  "p_listing_id: payload.listingId",
  '"Cache-Control": "private, no-store, max-age=0"',
  'Vary: "Authorization"',
  'Object.keys(payload).length !== 1',
  '!("listingId" in payload)',
  'return privateJson({ data: { phone } }, 200)'
]) assert.ok(route.includes(expected), `route must include ${expected}`);

assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE|sellerId|dealerId|profileId/i);
assert.doesNotMatch(route, /console\.(?:log|warn|error)/);
assert.match(button, /fetch\("\/api\/listing\/contact"/);
assert.match(button, /Authorization: `Bearer \$\{data\.session\.access_token\}`/);
assert.match(button, /body: JSON\.stringify\(\{ listingId \}\)/);
assert.doesNotMatch(button, /wa\.me|whatsapp/i);
assert.match(button, /href=\{`tel:\$\{phone\}`\}/);
assert.match(button, /if \(sellerId && data\.session\.user\.id === sellerId\)/);
assert.match(button, /router\.push\(loginPath\)/);
assert.match(page, /<ContactSellerButton listingId=\{listing\.listing_id\} sellerId=\{listing\.seller_id\} \/>/);
assert.match(authReturn, /\/tr\/listing\/abc#section/);
assert.doesNotMatch(listingQueries, /phone/);

console.log("FUNCTIONAL-02I seller contact flow contract passed");
