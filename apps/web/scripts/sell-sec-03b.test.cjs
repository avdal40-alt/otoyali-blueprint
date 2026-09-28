const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const wizard = read("src", "app", "sell", "_components", "SellWizard.tsx");
const requestAuth = read("src", "lib", "supabase", "request.ts");
const contract = read("src", "lib", "listings", "server-write.ts");
const createRoute = read("src", "app", "api", "listings", "route.ts");
const editRoute = read("src", "app", "api", "listings", "[id]", "route.ts");
const mediaRoute = read("src", "app", "api", "listings", "[id]", "media", "route.ts");
const coverRoute = read("src", "app", "api", "listings", "[id]", "media", "cover", "route.ts");
const submitRoute = read("src", "app", "api", "listings", "[id]", "submit", "route.ts");
const resubmitRoute = read("src", "app", "api", "listings", "[id]", "resubmit", "route.ts");

assert.match(requestAuth, /auth\.getUser\(\)/);
assert.match(requestAuth, /Authorization: authorization/);
assert.doesNotMatch(requestAuth, /service_role/i);
assert.match(contract, /\.strict\(\)/);
assert.match(contract, /listingWriteError/);
for (const route of [createRoute, editRoute, mediaRoute, coverRoute, submitRoute, resubmitRoute]) {
  assert.match(route, /requireAuthenticatedRequestSupabase/);
  assert.match(route, /privateApiHeaders/);
  assert.doesNotMatch(route, /service_role/i);
}
assert.match(createRoute, /create_own_listing_draft/);
assert.match(editRoute, /save_own_rejected_listing/);
assert.match(mediaRoute, /finalize_own_listing_sanitized_photo/);
assert.match(mediaRoute, /trustedSanitizedStorage/);
assert.doesNotMatch(mediaRoute, /attach_own_listing_media/);
assert.match(coverRoute, /set_own_listing_cover_media/);
assert.match(submitRoute, /submit_own_listing_for_review/);
assert.match(resubmitRoute, /resubmit_own_listing_for_review/);
assert.match(wizard, /\/api\/listings/);
assert.doesNotMatch(wizard, /\.from\("vehicle_profiles"\)\.insert/);
assert.doesNotMatch(wizard, /\.from\("listings"\)\.insert/);
assert.doesNotMatch(wizard, /\.from\("profile_media"\)\.insert/);
assert.doesNotMatch(wizard, /\.rpc\("(?:save_own_rejected_listing|submit_own_listing_for_review|resubmit_own_listing_for_review|set_own_listing_cover_media|initialize_own_vehicle_profile_ownership)"/);
console.log("SELL-SEC-03B server boundary static regression passed");
