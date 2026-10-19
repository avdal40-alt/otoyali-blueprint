const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const migration = read(repoRoot, "supabase", "migrations", "20261019175316_jlc_0514_admin_listing_moderation_read.sql");
const adminClient = read(repoRoot, "apps", "web", "src", "app", "admin", "_components", "AdminClient.tsx");
const reviewRoute = read(repoRoot, "apps", "web", "src", "app", "api", "admin", "listings", "review", "route.ts");

assert.doesNotMatch(adminClient, /\.schema\("vehicle"\)/, "admin listing UI must not call the vehicle Data API schema");
assert.match(adminClient, /rpc\("admin_list_listing_moderation"/, "admin listing UI must use the narrow RPC");
assert.match(adminClient, /createSignedUrl\(path, 60 \* 60\)/, "only returned sanitized preview paths may be signed");

for (const value of [
  "SECURITY DEFINER",
  "SET search_path = public, pg_catalog",
  "v_user_id IS NULL",
  "OT401",
  "NOT public.is_admin(v_user_id)",
  "OT403",
  "p_moderation_status NOT IN ('pending_review', 'active', 'rejected', 'archived')",
  "listing.created_at DESC, listing.id DESC",
  "LIMIT p_limit",
  "media.processed_status = 'processed'",
  "media.blur_status = 'blurred'",
  "media.thumb_path ~",
  "REVOKE ALL ON FUNCTION public.admin_list_listing_moderation(TEXT, INTEGER) FROM PUBLIC, anon, service_role, authenticated;",
  "GRANT EXECUTE ON FUNCTION public.admin_list_listing_moderation(TEXT, INTEGER) TO authenticated;"
]) assert.ok(migration.includes(value), `missing security or data contract: ${value}`);

for (const forbidden of [
  "private_vins", "profile_ownership", "profile_fact_evidence", "seller_contact", "raw_payload", "storage_path", "original_path", "original_url", "INSERT INTO", "UPDATE ", "DELETE ", "DROP ", "TRUNCATE ", "ALTER TABLE"
]) assert.ok(!migration.includes(forbidden), `private field or mutation is forbidden: ${forbidden}`);

assert.match(migration, /RETURNS TABLE\([\s\S]*?preview_path TEXT[\s\S]*?\)/, "RPC must return only moderation UI fields and a safe preview path");
assert.match(reviewRoute, /rpc\("review_listing_moderation"/, "moderation write RPC must remain unchanged");

console.log("JLC-0514 secure admin listing moderation read boundary contract passed");
