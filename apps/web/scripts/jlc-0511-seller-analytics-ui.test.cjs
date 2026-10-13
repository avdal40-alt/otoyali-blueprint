const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(webRoot, "src", "app", "profile", "listings", "_components", "MyListingsClient.tsx"), "utf8");
const copy = fs.readFileSync(path.join(webRoot, "src", "app", "profile", "listings", "my-listings-copy.ts"), "utf8");

assert.match(source, /supabase\.rpc\("list_own_seller_analytics"\)/);
assert.match(source, /analyticsRows, error: analyticsError/);
assert.match(source, /setAnalyticsUnavailable\(true\)/);
assert.match(source, /copy\.analyticsUnavailable/);
assert.match(source, /aria-label=\{copy\.analyticsTitle\}/);
assert.match(source, /grid-cols-2 gap-2 sm:grid-cols-4/);
for (const metric of ["analyticsViews", "analyticsContacts", "analyticsFavorites", "analyticsMessages"]) {
  assert.match(source, new RegExp(`copy\\.${metric}`));
  assert.match(copy, new RegExp(`${metric}:`));
}
assert.match(copy, /analyticsUnavailable:/);
console.log("JLC-0511 seller analytics UI contract: PASS");
