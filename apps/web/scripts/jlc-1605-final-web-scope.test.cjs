const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const sql = read("..", "..", "supabase", "migrations", "20261104130000_jlc_1605_specialty_marketplace.sql");
const verticals = read("src", "lib", "marketplace", "verticals.ts");
const specialty = read("src", "components", "verticals", "SpecialtyMarketplacePage.tsx");
const form = read("src", "components", "verticals", "SpecialtySellerForm.tsx");
const personalization = read("src", "components", "home", "PersonalizedListings.tsx");
const theme = read("src", "components", "layout", "ThemeToggle.tsx");
const css = read("src", "app", "globals.css");
for (const vertical of ["motorcycles", "marine", "mobility"]) {
  assert.match(verticals, new RegExp(`id: "${vertical}"[\\s\\S]*?status: "active"[\\s\\S]*?seoIndexable: true`));
  assert.match(sql, new RegExp(`'${vertical}'`));
}
assert.match(sql, /CREATE TABLE marketplace\.specialty_listings/);
assert.match(sql, /identity\.require_kazakhstan_seller_contact_phone/);
assert.match(sql, /review_specialty_listing/);
assert.match(sql, /reserve_specialty_listing_seller_contact_disclosure/);
assert.match(sql, /REVOKE ALL ON marketplace\.specialty_listings FROM PUBLIC, anon, authenticated/);
assert.match(specialty, /public_specialty_listings/);
assert.match(form, /sellerContactPhoneId/);
assert.match(personalization, /sessionStorage/);
assert.match(personalization, /Recently viewed/);
assert.match(theme, /prefers-color-scheme/);
assert.match(css, /data-theme="dark"/);
console.log("JLC-1605 vertical, personalization and dark-mode contract tests passed.");
