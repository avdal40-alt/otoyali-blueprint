const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), "utf8");
const readiness = read("docs", "jolcar-control", "JLC-1502-MOBILE-API-READINESS.md");
const searchContract = read("apps", "web", "src", "lib", "search", "search-contract.ts");
const searchService = read("apps", "web", "src", "lib", "search", "search-service.ts");
const requestAuth = read("apps", "web", "src", "lib", "supabase", "request.ts");
const conversations = read("apps", "web", "src", "app", "api", "conversations", "route.ts");
const notifications = read("apps", "web", "src", "app", "api", "notifications", "route.ts");
const media = read("apps", "web", "src", "app", "api", "listings", "[id]", "media", "route.ts");
const sellerContact = read("apps", "web", "src", "app", "api", "listing", "contact", "route.ts");

for (const term of ["Search v1", "Authentication", "errors", "pagination", "media", "authorization", "No React Native"]) {
  assert.match(readiness, new RegExp(term, "i"), `readiness contract documents ${term}`);
}
assert.match(searchContract, /export type SearchV1Request/);
assert.match(searchContract, /export type SearchV1Response/);
assert.match(searchContract, /has_video/);
assert.match(searchService, /search_listings_v1/);
assert.match(searchService, /PostgreSQL remains authoritative/);
assert.match(requestAuth, /Authorization: authorization/);
assert.match(requestAuth, /auth\.getUser/);
assert.match(conversations, /parseCursor/);
assert.match(conversations, /rateLimit\(authenticated\.userId, "create"\)/);
assert.match(notifications, /nextCursor/);
assert.match(media, /sanitizePrivatePhoto/);
assert.match(media, /finalize_own_listing_sanitized_photo/);
assert.match(sellerContact, /reserve_listing_seller_contact_disclosure/);
assert.match(sellerContact, /get_listing_seller_contact/);

for (const source of [requestAuth, conversations, notifications, media, sellerContact]) {
  assert.doesNotMatch(source, /service_role|SUPABASE_SERVICE_ROLE_KEY/i, "mobile-reusable route boundary must not expose service credentials");
}

console.log("JLC-1502 mobile API readiness contract passed");
