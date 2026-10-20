const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const migrations = fs.readdirSync(path.join(root, "supabase/migrations"));
const migrationName = migrations.find((name) => /_jlc_0519_staff_seller_dealer_boundary\.sql$/.test(name));
assert.ok(migrationName, "JLC-0519 migration is required");
const migration = fs.readFileSync(path.join(root, "supabase/migrations", migrationName), "utf8");

for (const forbidden of [/pg_get_functiondef/i, /\bpg_proc\b/i, /v_definition/i, /strpos\(v_definition/i, /overlay\(/i]) {
  assert.doesNotMatch(migration, forbidden, "JLC-0519 must contain deterministic explicit function definitions only");
}

for (const name of [
  "create_own_listing_draft", "create_own_listing_draft_v2", "create_own_private_listing_draft", "save_own_listing_edit", "save_own_rejected_listing",
  "submit_own_listing_for_review", "resubmit_own_listing_for_review", "pause_own_listing", "archive_own_listing", "raise_own_listing",
  "sync_own_verified_account_phone", "initialize_own_vehicle_profile_ownership", "submit_own_vin", "finalize_own_listing_sanitized_photo_v2",
  "issue_own_listing_video_upload_intent", "finalize_own_listing_video_upload_intent", "replace_own_listing_video_upload_intent", "revoke_own_listing_video_upload_intent",
  "submit_own_dealer_verification", "create_own_dealer_feed_api_token", "revoke_own_dealer_feed_api_token", "manage_dealer_staff_member",
  "create_dealer_lead", "update_dealer_lead", "create_own_dealer_live_stream", "start_own_dealer_live_stream", "end_own_dealer_live_stream"
]) assert.match(migration, new RegExp("CREATE(?: OR REPLACE)? FUNCTION (?:public|marketplace|vehicle)\\." + name + "\\s*\\(", "i"), `missing explicit protected mutation ${name}`);

for (const name of ["submit_own_vin", "create_own_listing_draft_v2", "set_own_listing_seller_contact_phone", "create_dealer_lead"]) {
  assert.doesNotMatch(migration, new RegExp("CREATE FUNCTION (?:public|marketplace|vehicle)\\." + name + "\\s*\\(", "i"), `existing ${name} must use CREATE OR REPLACE`);
}
for (const policy of ["listings_insert_own", "listings_update_own", "listings_delete_own_draft", "vehicle_profiles_insert_own", "vehicle_profiles_update_owner", "profile_media_insert_owner", "profile_media_update_owner", "profile_media_delete_owner", "profile_fact_evidence_insert_seller_owner", "profile_fact_evidence_update_seller_owner", "profile_fact_evidence_delete_seller_owner", "body_panel_declarations_insert_owner", "body_panel_declarations_update_owner", "body_panel_declarations_delete_owner", "listing_media_insert_temp_own", "listing_media_update_temp_own", "listing_media_delete_temp_own", "vehicle_photos_insert_own_folder", "vehicle_photos_update_own_folder", "vehicle_photos_delete_own_folder"]) {
  assert.match(migration, new RegExp("DROP POLICY IF EXISTS " + policy + "[\\s\\S]{0,900}NOT public\\.is_admin\\(auth\\.uid\\(\\)\\)", "i"), `missing staff denial for ${policy}`);
}
assert.doesNotMatch(migration, /profile_ownership_insert_own_created_profile/);
assert.doesNotMatch(migration, /owner_reviews_(insert_own|update_own_pending)|owner_review_reports_insert_own/);

assert.match(migration, /staff accounts cannot perform seller actions/);
assert.match(migration, /ERRCODE = 'OT401'[\s\S]*ERRCODE = 'OT403'/);
assert.match(migration, /DROP POLICY IF EXISTS listings_update_admins ON marketplace\.listings/);
assert.match(migration, /NOT public\.is_admin\(auth\.uid\(\)\)/);
assert.match(migration, /can_manage_own_listing_video_storage_path/);
assert.match(migration, /can_insert_own_listing_video_from_active_intent/);
assert.match(migration, /finalize_own_listing_sanitized_photo_v2/);
assert.doesNotMatch(migration, /review_listing_moderation\(/, "admin moderation RPCs must remain untouched");

const requestBoundary = fs.readFileSync(path.join(root, "apps/web/src/lib/supabase/request.ts"), "utf8");
assert.match(requestBoundary, /guardSellerMutationRpcs/);
assert.match(requestBoundary, /staff accounts cannot perform seller actions/);
assert.match(requestBoundary, /finalize_own_listing_sanitized_photo_v2/);
assert.match(requestBoundary, /create_own_dealer_live_stream/);
const sellerGate = fs.readFileSync(path.join(root, "apps/web/src/app/sell/_components/SellerEntryGate.tsx"), "utf8");
const sellWizard = fs.readFileSync(path.join(root, "apps/web/src/app/sell/_components/SellWizard.tsx"), "utf8");
const sellerContacts = fs.readFileSync(path.join(root, "apps/web/src/app/profile/seller-contacts/_components/SellerContactsClient.tsx"), "utf8");
assert.match(sellerGate, /resolvePlatformStaffState[\s\S]*router\.replace\(localizePath\("\/admin"[\s\S]*sync_own_verified_account_phone/);
assert.match(sellWizard, /is_admin[\s\S]*router\.replace\(localizePath\("\/admin"[\s\S]*sync_own_verified_account_phone/);
assert.match(sellerContacts, /is_admin[\s\S]*router\.replace\(localizePath\("\/admin"[\s\S]*sync_own_verified_account_phone/);

console.log("JLC-0519 static staff/seller/dealer boundary contract passed");
