const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/20261006135710_separate_listing_drafts_from_moderation.sql");
const archiveMigration = read("supabase/migrations/20261007093014_allow_archive_saved_drafts.sql");
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
assert.match(serverWrite, /rpc\("create_own_listing_draft_v2"/);
assert.match(serverWrite, /p_seller_contact_phone_id: payload\.sellerContactPhoneId/);
assert.match(serverWrite, /rpc\("save_own_listing_edit"/);
assert.match(sellWizard, /\/api\/listings\/\$\{listingId\}\/submit/);
assert.match(sellWizard, /if \(submitError\) \{[\s\S]*?setError\(copy\.submitFailure\);[\s\S]*?return;[\s\S]*?\}/);
assert.match(sellWizard, /setPublishedListingId\(listingId\);\s*return;/);
assert.match(myListings, /item\.moderation_status === "draft"/);
assert.match(archiveMigration, /v_listing\.status IN \('draft', 'active', 'paused', 'removed'\)/);
assert.match(archiveMigration, /v_listing\.moderation_status IN \('active', 'pending_review', 'rejected'\)/);
assert.match(archiveMigration, /v_listing\.status = 'draft' AND v_listing\.moderation_status = 'draft'/);
assert.match(archiveMigration, /SECURITY DEFINER/);
assert.match(archiveMigration, /vehicle\.is_current_profile_owner/);
assert.match(archiveMigration, /'listing\.archive'/);
assert.match(archiveMigration, /REVOKE ALL ON FUNCTION public\.archive_own_listing\(UUID\) FROM PUBLIC/);
assert.match(archiveMigration, /GRANT EXECUTE ON FUNCTION public\.archive_own_listing\(UUID\) TO authenticated/);

console.log("LAUNCH-03D3C3 draft lifecycle contract: PASS");
