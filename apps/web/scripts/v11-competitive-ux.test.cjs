const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const filters = read("src", "components", "search", "SearchFilters.tsx");
const card = read("src", "components", "vehicle", "VehicleCard.tsx");
const page = read("src", "app", "listing", "[id]", "page.tsx");
const ledger = read("src", "app", "listing", "[id]", "_components", "ListingTrustLedger.tsx");
const copy = read("src", "app", "listing", "[id]", "listing-detail-copy.ts");
const script = read("scripts", "verify-supabase-cli-version.cjs");

const quick = filters.slice(0, filters.indexOf("{showAdvanced ?"));
const advanced = filters.slice(filters.indexOf("{showAdvanced ?"));
assert.match(quick, /label=\{String\(dictionary\.search\.brand\)\}/);
assert.match(quick, /label=\{String\(dictionary\.search\.model\)\}/);
assert.match(quick, /filters\.priceMin/);
assert.match(quick, /filters\.priceMax/);
assert.doesNotMatch(quick, /vehicleMarketplaceV2Copy\("vehicleCategory"/);
assert.match(advanced, /vehicleMarketplaceV2Copy\("vehicleCategory"/);
assert.match(advanced, /vehicleMarketplaceV2Copy\("listingPurpose"/);

assert.ok(card.indexOf("formatListingPurposePrice(listing, activeLocale)") < card.indexOf("<h3"), "price precedes vehicle identity");
assert.doesNotMatch(card, /video_count/, "video is not a third prominent card badge");
assert.match(card, /aspect-\[4\/3\]/, "approved image ratio remains intact");

assert.match(page, /<ListingTrustLedger copy=\{copy\}/);
for (const key of ["trustLedgerTitle", "trustSellerStatus", "trustPublishedStatus", "trustExternalStatus"]) {
  assert.match(copy, new RegExp(`${key}:`), `${key} is localized`);
}
assert.match(ledger, /publishedAt/);
assert.match(copy, /External history|Сыртқы тарих|Внешняя история|外部历史/, "ledger has an honest external-provider state");

assert.match(script, /const expected = "2\.115\.0"/);
assert.match(script, /SUPABASE_CLI_BIN/);

console.log("V11 competitive UX integration static checks passed");
