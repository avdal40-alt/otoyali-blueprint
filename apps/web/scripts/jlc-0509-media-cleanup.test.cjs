const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const migration = read(repoRoot, "supabase", "migrations", "20261012110000_jlc0509_retryable_media_cleanup.sql");
const removeRoute = read(webRoot, "src", "app", "api", "listings", "[id]", "media", "[mediaId]", "route.ts");
const retryRoute = read(webRoot, "src", "app", "api", "listings", "[id]", "media", "cleanup", "[cleanupId]", "route.ts");

for (const value of [
  "CREATE TABLE public.listing_media_cleanup_tasks",
  "ENABLE ROW LEVEL SECURITY",
  "REVOKE ALL ON TABLE public.listing_media_cleanup_tasks FROM PUBLIC, anon, authenticated",
  "listing.seller_id = auth.uid()",
  "INSERT INTO public.listing_media_cleanup_tasks",
  "DELETE FROM vehicle.profile_media",
  "get_own_listing_media_cleanup_task",
  "seller_id = auth.uid() AND status = 'pending'",
  "complete_own_listing_media_cleanup_task",
  "GRANT EXECUTE ON FUNCTION public.get_own_listing_media_cleanup_task(uuid, uuid) TO authenticated"
]) assert.ok(migration.includes(value), `cleanup contract missing: ${value}`);

for (const value of [
  "trustedSanitizedStorage.remove",
  "get_own_pending_listing_media_cleanup_task",
  "complete_own_listing_media_cleanup_task",
  "cleanupIncomplete",
  "cleanupTaskId"
]) assert.ok(removeRoute.includes(value), `initial cleanup route missing: ${value}`);

for (const value of [
  "requireAuthenticatedRequestSupabase",
  "get_own_listing_media_cleanup_task",
  "trustedSanitizedStorage.remove",
  "complete_own_listing_media_cleanup_task",
  "cleanupIncomplete: true"
]) assert.ok(retryRoute.includes(value), `retry route missing: ${value}`);

console.log("JLC-0509 owner-scoped persisted media cleanup and durable retry contracts passed");
