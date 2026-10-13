const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..", "..");
const read = (root, relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const page = read(webRoot, "src/app/dealer/[id]/page.tsx");
const initialProjection = read(repoRoot, "supabase/migrations/20261010150000_dealer_public_profile.sql");
const currentProjection = read(repoRoot, "supabase/migrations/20261010193000_functional_09_dealer_follow.sql");

assert.match(page, /get_public_dealer_profile/);
assert.match(page, /profile\.avatar_url/);
assert.match(page, /aria-label="Dealer cover"/);
assert.match(page, /profile\.display_name/);
assert.match(page, /profile\.description/);
assert.match(page, /profile\.city/);
assert.match(page, /profile\.is_verified/);
assert.match(page, /profile\.stock_count/);
assert.match(page, /md:flex-row/);
assert.match(page, /sm:grid-cols-2/);

for (const projection of [initialProjection, currentProjection]) {
  const match = projection.match(/CREATE OR REPLACE FUNCTION public\.get_public_dealer_profile\([\s\S]*?AS \$\$([\s\S]*?)\$\$/);
  assert.ok(match, "public dealer profile function must be present");
  assert.match(projection, /REVOKE ALL ON FUNCTION public\.get_public_dealer_profile\(UUID\) FROM PUBLIC/);
  assert.match(projection, /GRANT EXECUTE ON FUNCTION public\.get_public_dealer_profile\(UUID\) TO anon, authenticated/);
  assert.doesNotMatch(match[1], /phone|email|contact_id|auth\.users/i);
}

console.log("JLC-0902 public dealer profile shell contract checks passed");
