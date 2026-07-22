const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const migrationPath = path.join(repoRoot, "supabase", "migrations", "20260721140000_security01_listing_lifecycle_hardening.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf8");
const myListingsSource = fs.readFileSync(path.join(projectRoot, "src", "app", "profile", "listings", "_components", "MyListingsClient.tsx"), "utf8");
const sellWizardSource = fs.readFileSync(path.join(projectRoot, "src", "app", "sell", "_components", "SellWizard.tsx"), "utf8");
const adminClientSource = fs.readFileSync(path.join(projectRoot, "src", "app", "admin", "_components", "AdminClient.tsx"), "utf8");
const adminRouteSource = fs.readFileSync(path.join(projectRoot, "src", "app", "api", "admin", "listings", "review", "route.ts"), "utf8");

function includesAll(source, values) {
  for (const value of values) {
    assert.ok(source.includes(value), `Expected source to include: ${value}`);
  }
}

function excludesAll(source, values) {
  for (const value of values) {
    assert.ok(!source.includes(value), `Expected source to exclude: ${value}`);
  }
}

includesAll(migrationSql, [
  "REVOKE UPDATE ON marketplace.listings FROM authenticated;",
  "GRANT UPDATE (",
  "CREATE POLICY listings_insert_own",
  "AND status = 'draft'",
  "AND moderation_status = 'pending_review'",
  "CREATE OR REPLACE FUNCTION public.submit_own_listing_for_review(p_listing_id UUID)",
  "CREATE OR REPLACE FUNCTION public.resubmit_own_listing_for_review(p_listing_id UUID)",
  "CREATE OR REPLACE FUNCTION public.pause_own_listing(p_listing_id UUID)",
  "CREATE OR REPLACE FUNCTION public.archive_own_listing(p_listing_id UUID)",
  "CREATE OR REPLACE FUNCTION public.review_listing_moderation(",
  "SECURITY DEFINER",
  "SET search_path = public, pg_catalog",
  "FOR UPDATE",
  "auth.uid()",
  "public.is_admin(v_user_id)",
  "p_decision TEXT",
  "v_decision NOT IN ('approve', 'reject')",
  "RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'",
  "RAISE EXCEPTION 'admin authorization required' USING ERRCODE = 'OT403'",
  "RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'",
  "RAISE EXCEPTION 'illegal listing moderation transition' USING ERRCODE = 'OT409'",
  "RAISE EXCEPTION 'unsupported listing moderation decision' USING ERRCODE = 'OT422'",
  "INSERT INTO public.admin_audit_logs",
  "'listing.submit'",
  "'listing.resubmit'",
  "'listing.pause'",
  "'listing.archive'",
  "'listing.approve'",
  "'listing.reject'",
  "NOTIFY pgrst, 'reload schema';"
]);

excludesAll(migrationSql, [
  "GRANT UPDATE ON marketplace.listings TO authenticated",
  "set_listing_status",
  "EXECUTE IMMEDIATE",
  "DROP TABLE marketplace.listings",
  "ALTER TABLE marketplace.listings DISABLE ROW LEVEL SECURITY",
  "GRANT EXECUTE ON FUNCTION public.submit_own_listing_for_review(UUID) TO anon",
  "GRANT EXECUTE ON FUNCTION public.review_listing_moderation(UUID, TEXT, TEXT) TO anon",
  "GRANT EXECUTE ON FUNCTION public.review_listing_moderation(UUID, TEXT, TEXT) TO service_role"
]);

for (const signature of [
  "public.submit_own_listing_for_review(UUID)",
  "public.resubmit_own_listing_for_review(UUID)",
  "public.pause_own_listing(UUID)",
  "public.archive_own_listing(UUID)",
  "public.review_listing_moderation(UUID, TEXT, TEXT)"
]) {
  includesAll(migrationSql, [
    `REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC;`,
    `REVOKE ALL ON FUNCTION ${signature} FROM anon;`,
    `REVOKE ALL ON FUNCTION ${signature} FROM service_role;`,
    `REVOKE ALL ON FUNCTION ${signature} FROM authenticated;`,
    `GRANT EXECUTE ON FUNCTION ${signature} TO authenticated;`
  ]);
}

const forbiddenProtectedColumnUpdatePattern =
  /\.from\("listings"\)\s*[\s\S]{0,220}\.update\(\s*\{[\s\S]{0,240}(?:status|moderation_status|rejection_reason|moderated_by|moderated_at|published_at|archived_at)\s*:/;

assert.equal(forbiddenProtectedColumnUpdatePattern.test(myListingsSource), false, "MyListings must not update protected listing columns directly");
assert.equal(forbiddenProtectedColumnUpdatePattern.test(sellWizardSource), false, "SellWizard must not update protected listing columns directly");
assert.equal(forbiddenProtectedColumnUpdatePattern.test(adminClientSource), false, "AdminClient must not update protected listing columns directly");

includesAll(myListingsSource, [
  "submit_own_listing_for_review",
  "resubmit_own_listing_for_review",
  "pause_own_listing",
  "archive_own_listing",
  "supabase.rpc(ownerLifecycleRpc[action]",
  "lifecycleErrorMessage"
]);
excludesAll(myListingsSource, [
  "Yeniden yayınla",
  "updateListingWorkflow"
]);

includesAll(sellWizardSource, [
  'supabase.rpc("submit_own_listing_for_review"',
  "quality_score: qualityScore",
  "cover_media_id: coverMediaId"
]);

includesAll(adminClientSource, [
  'fetch("/api/admin/listings/review"',
  "Authorization: `Bearer ${accessToken}`",
  'decision: action',
  "row.moderation_status === \"pending_review\""
]);
excludesAll(adminClientSource, [
  "archive_listing",
  "logAdminAction(userId, `${action}_listing`"
]);

includesAll(adminRouteSource, [
  "allowedDecisions = new Set([\"approve\", \"reject\"])",
  "review_listing_moderation",
  "p_listing_id",
  "p_decision",
  "p_rejection_reason",
  "OT401",
  "OT403",
  "OT404",
  "OT409",
  "OT422"
]);
excludesAll(adminRouteSource, [
  "service_role",
  "SUPABASE_SERVICE",
  "error.message"
]);

console.log("security lifecycle tests passed");
