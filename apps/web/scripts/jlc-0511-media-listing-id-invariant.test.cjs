const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const wizard = fs.readFileSync(path.join(root, "src", "app", "sell", "_components", "SellWizard.tsx"), "utf8");
const mediaRoute = fs.readFileSync(path.join(root, "src", "app", "api", "listings", "[id]", "media", "route.ts"), "utf8");

assert.match(wizard, /const listingId = draft\.listingId;/);
assert.match(wizard, /for \(const \[sortOrder, photo\] of state\.photos\.entries\(\)\)/);
assert.match(wizard, /`\/api\/listings\/\$\{listingId\}\/media`/);
assert.match(wizard, /activeCreateDraft\.current = draft;/);
assert.match(wizard, /let draft = activeCreateDraft\.current;/);
assert.doesNotMatch(wizard, /set[A-Za-z]+DraftId\(/);

assert.match(mediaRoute, /const finalizationListingId = listingId\.data;/);
assert.match(mediaRoute, /route_listing_uuid: listingId\.data/);
assert.match(mediaRoute, /finalize_listing_uuid: finalizationListingId/);
assert.match(mediaRoute, /media_uuid: payload\.mediaId/);
assert.match(mediaRoute, /photo_ordinal: payload\.sortOrder/);
assert.match(mediaRoute, /safeLog\("info", "listing_media_finalize_attempt", finalizationContext\)/);
assert.match(mediaRoute, /p_listing_id: finalizationListingId/);
assert.match(mediaRoute, /safeLog\("warn", "listing_media_finalize_failed", \{ \.\.\.finalizationContext, postgres_code: error\.code \?\? null \}\)/);

console.log("JLC-0511 wizard media listing-ID invariant contract passed");
