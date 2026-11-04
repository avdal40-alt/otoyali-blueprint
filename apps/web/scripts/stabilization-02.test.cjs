const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const layout = read("src", "app", "layout.tsx");
const policy = read("src", "app", "moderation-policy", "page.tsx");
const about = read("src", "app", "about", "page.tsx");
const seo = read("src", "lib", "seo", "metadata.ts");
const verticals = read("src", "lib", "marketplace", "verticals.ts");
const cities = read("src", "components", "home", "PopularCitiesSection.tsx");
const listing = read("src", "app", "listing", "[id]", "page.tsx");

assert.doesNotMatch(layout, /AssistantRoot|Rif/);
assert.doesNotMatch(policy, /WEB-10|FUNCTIONAL-|SECURITY-|TODO|FIXME/);
assert.doesNotMatch(about, /OTOYALI, araç arama ve ilan deneyimini sade, hızlı ve güvenilir hale getirir/);
assert.match(seo, /profile\.metadata\.defaultLocale/);
assert.doesNotMatch(seo, /\? "en_US" : "tr_TR"/);
assert.match(cities, /cities: City\[\]/);
assert.doesNotMatch(cities, /model_name|model_slug/);
assert.match(verticals, /id: "cars"[\s\S]*?seoIndexable: true/);
assert.match(verticals, /id: "parts"[\s\S]*?status: "active"[\s\S]*?seoIndexable: true/);
assert.match(verticals, /id: "insurance"[\s\S]*?status: "active"[\s\S]*?seoIndexable: true/);
for (const id of ["commercial", "services"]) {
  assert.match(verticals, new RegExp(`id: "${id}"[\\s\\S]*?status: "coming_soon"[\\s\\S]*?seoIndexable: false`));
}
for (const id of ["machinery"]) {
  assert.match(verticals, new RegExp(`id: "${id}"[\\s\\S]*?status: "disabled"[\\s\\S]*?seoIndexable: false`));
}
for (const id of ["motorcycles", "marine", "mobility"]) {
  assert.match(verticals, new RegExp(`id: "${id}"[\\s\\S]*?status: "active"[\\s\\S]*?seoIndexable: true`));
}
assert.match(listing, /filter\(\(item\) => item\.listing_id !== listing\?\.listing_id\)/);
assert.match(listing, /make_name === listing\?\.make_name/);
console.log("STABILIZATION-02 public polish regression passed");
