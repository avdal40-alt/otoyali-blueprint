const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const migration = fs.readFileSync(
  path.join(repoRoot, "supabase", "migrations", "20260827123000_security_final_storage_moderation.sql"),
  "utf8"
);
const helper = fs.readFileSync(path.join(projectRoot, "src", "lib", "media", "storage-urls.ts"), "utf8");

assert.match(migration, /SET public = FALSE/);
for (const bucket of ["vehicle-photos", "listing-media", "listing-videos"]) {
  assert.match(migration, new RegExp(`bucket_id = '${bucket}'`));
}
assert.match(migration, /vehicle\.has_active_listing\(media\.vehicle_profile_id\)/);
assert.match(migration, /video\.status = 'active'/);
assert.match(migration, /listing\.moderation_status = 'active'/);
assert.match(helper, /createSignedUrl\(path, SIGNED_URL_TTL_SECONDS\)/);
assert.match(helper, /signStorageUrlMap\(supabase, "listing-media", values\)/);
assert.match(helper, /signStorageUrlMap\(supabase, "vehicle-photos", values\)/);

for (const relativePath of [
  ["src", "lib", "queries", "listings.ts"],
  ["src", "lib", "queries", "media.ts"],
  ["src", "lib", "queries", "videos.ts"],
  ["src", "app", "favorites", "_components", "FavoritesClient.tsx"],
  ["src", "app", "profile", "listings", "_components", "MyListingsClient.tsx"],
  ["src", "app", "sell", "_components", "SellWizard.tsx"],
  ["src", "app", "admin", "_components", "AdminClient.tsx"]
]) {
  const source = fs.readFileSync(path.join(projectRoot, ...relativePath), "utf8");
  assert.match(source, /sign(?:Image)?StorageUrlMap/, `${relativePath.join("/")} must sign private media URLs`);
}

console.log("SECURITY-FINAL storage moderation contract passed");
