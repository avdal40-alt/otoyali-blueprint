const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function source(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

const metadata = source("src/lib/seo/metadata.ts");
const layout = source("src/app/layout.tsx");
const contact = source("src/app/contact/page.tsx");
const sellCopy = source("src/app/sell/sell-copy.ts");
const favorites = source("src/app/favorites/_components/FavoritesClient.tsx");
const favoriteButton = source("src/components/vehicle/FavoriteButton.tsx");
const publicSourceRoots = ["src/app", "src/components", "src/lib/seo"];

assert.match(metadata, /SITE_URL = "https:\/\/yolmod\.com"/);
assert.doesNotMatch(metadata, /otoyali\.vercel\.app/);
assert.match(layout, /metadataBase: new URL\("https:\/\/yolmod\.com"\)/);
assert.match(contact, /support@yolmod\.com/);
assert.match(contact, /legal@yolmod\.com/);
assert.doesNotMatch(contact, /yayın öncesinde|yayına hazırlık/i);
assert.match(sellCopy, /Galeri erişimi davetle verilir/);
assert.match(sellCopy, /Dealer access is invite-only/);
assert.match(favorites, /dictionary\.favorites\.loadFailed/);
assert.doesNotMatch(favorites, /setError\((?:favoriteError|listingError)\.message\)/);
assert.match(favoriteButton, /dictionary\.favorites\.actionFailed/);
for (const root of publicSourceRoots) {
  const entries = fs.readdirSync(path.join(__dirname, "..", root), { recursive: true });
  for (const entry of entries) {
    if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) continue;
    const relativePath = path.join(root, entry);
    assert.doesNotMatch(source(relativePath), /OTOYALI/, relativePath);
  }
}

console.log("LAUNCH-03B1 source checks passed.");
