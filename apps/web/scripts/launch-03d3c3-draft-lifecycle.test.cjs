const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/20261006135710_separate_listing_drafts_from_moderation.sql");
const serverWrite = read("apps/web/src/lib/listings/server-write.ts");
const sellWizard = read("apps/web/src/app/sell/_components/SellWizard.tsx");
const myListings = read("apps/web/src/app/profile/listings/_components/MyListingsClient.tsx");

assert.match(migration, /create_own_private_listing_draft/);
assert.match(migration, /moderation_status = 'draft'/);
assert.match(migration, /REVOKE EXECUTE ON FUNCTION public\.create_own_listing_draft[\s\S]*FROM authenticated/);
assert.match(migration, /v_listing\.moderation_status <> 'draft'/);
assert.match(migration, /SET moderation_status = 'pending_review'/);
assert.match(migration, /get_own_listing_for_edit/);
assert.match(migration, /save_own_listing_edit/);
assert.match(serverWrite, /rpc\("create_own_private_listing_draft"/);
assert.match(serverWrite, /rpc\("save_own_listing_edit"/);
assert.match(sellWizard, /setPublishedListingId\(listingId\);\s*return;/);
assert.doesNotMatch(sellWizard, /\/api\/listings\/\$\{listingId\}\/submit/);
assert.match(myListings, /item\.moderation_status === "draft"/);

console.log("LAUNCH-03D3C3 draft lifecycle contract: PASS");
