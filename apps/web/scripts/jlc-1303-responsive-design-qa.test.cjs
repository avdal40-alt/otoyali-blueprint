const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");

const coreSurfaces = {
  marketplaceHome: read("src/components/home/HomePageContent.tsx"),
  search: read("src/app/search/_components/SearchClient.tsx"),
  listingDetail: read("src/app/listing/[id]/page.tsx"),
  sellerListings: read("src/app/profile/listings/page.tsx"),
  dealerCrm: read("src/app/profile/dealer-crm/page.tsx"),
  dealerAnalytics: read("src/app/profile/dealer-analytics/page.tsx")
};

// Desktop and compact shell parity for the public marketplace plus seller/dealer
// workspace surfaces. The footer reserves space for compact navigation.
for (const [name, source] of Object.entries(coreSurfaces)) {
  assert.match(source, /<AppHeader\s*\/?\s*>/, `${name} must retain the desktop header`);
  assert.match(source, /<MarketplaceFooter\s*\/?\s*>/, `${name} must retain the desktop footer`);
  assert.match(source, /<MobileBottomNav\s*\/?\s*>/, `${name} must retain compact navigation`);
}

const globals = read("src/app/globals.css");
const tokens = read("src/lib/design-system/tokens.ts");
const card = read("src/components/vehicle/VehicleCard.tsx");
const grid = read("src/components/vehicle/VehicleGrid.tsx");
const button = read("src/components/ui/Button.tsx");
const filterDrawer = read("src/components/search/MobileFilterDrawer.tsx");
const bottomNav = read("src/components/layout/MobileBottomNav.tsx");

// The confirmed 4:3 card region is reserved before image decoding and each
// shared grid starts at a single compact-safe column.
assert.match(card, /relative aspect-\[4\/3\] bg-oto-surface/);
assert.match(grid, /grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-4/);
assert.match(grid, /grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3/);

// Palette, motion, and a11y remain tokenized and respect reduced-motion users.
assert.match(tokens, /accent: "var\(--brand-accent\)"/);
assert.match(tokens, /transition:\s*\{[\s\S]*?fast: "120ms"[\s\S]*?base: "180ms"[\s\S]*?slow: "240ms"/);
assert.match(globals, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(globals, /font-size:\s*1rem/);
assert.match(button, /min-w-11/);
assert.match(button, /focus-visible:ring-2/);
assert.match(filterDrawer, /role="dialog" aria-modal="true"/);
assert.match(bottomNav, /safe-bottom fixed inset-x-0 bottom-0/);
assert.match(bottomNav, /min-h-16/);

// Dark tokens remain available, but the launch requirement treats dark mode as
// progressive enhancement rather than a release blocker.
assert.match(globals, /:root\[data-theme="dark"\]/);

console.log("JLC-1303 desktop/compact responsive design QA matrix passed");
