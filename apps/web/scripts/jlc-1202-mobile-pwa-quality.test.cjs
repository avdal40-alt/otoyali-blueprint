const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");

const search = read("src/app/search/_components/SearchClient.tsx");
const listing = read("src/app/listing/[id]/page.tsx");
const sellerListings = read("src/app/profile/listings/page.tsx");
const dealerCrm = read("src/app/profile/dealer-crm/page.tsx");
const dealerAnalytics = read("src/app/profile/dealer-analytics/page.tsx");
const mobileNavigation = read("src/components/layout/MobileBottomNav.tsx");
const manifest = JSON.parse(read("public/manifest.webmanifest"));

assert.match(search, /<MobileFilterDrawer[\s\S]*?\{renderFilterPanel\(\)\}/, "search must expose filters through the compact drawer");
assert.match(search, /<MobileBottomNav\s*\/>/, "search must retain compact navigation");
assert.match(listing, /fixed inset-x-0 bottom-16[\s\S]*?<ContactSellerButton[\s\S]*?<StartConversationButton/, "listing detail must retain compact contact and message actions");
assert.match(listing, /<MobileBottomNav\s*\/>/, "listing detail must retain compact navigation");

for (const [name, source] of Object.entries({ sellerListings, dealerCrm, dealerAnalytics })) {
  assert.match(source, /<MarketplaceFooter\s*\/>/, `${name} must retain the marketplace footer`);
  assert.match(source, /<MobileBottomNav\s*\/>/, `${name} must retain compact navigation`);
}

assert.match(mobileNavigation, /safe-bottom fixed inset-x-0 bottom-0/, "bottom navigation must account for device safe area");
assert.equal(manifest.display, "standalone", "the existing PWA architecture must remain installable");
assert.equal(manifest.start_url, "/", "the PWA must open at the marketplace root");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, "the PWA manifest must retain an install icon");

console.log("JLC-1202 compact buyer/seller/dealer and existing PWA contract checks passed");
