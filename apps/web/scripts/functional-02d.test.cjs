const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const page = read("src/app/search/page.tsx");
const client = read("src/app/search/_components/SearchClient.tsx");
const query = read("src/lib/search/server-search.ts");
const params = read("src/lib/search/search-params.ts");

assert.doesNotMatch(page, /getHomeListings\(60\)/);
assert.match(page, /searchListings\(initialFilters/);
assert.match(query, /schema\("marketplace"\)\.rpc\("search_listings_v1"/);
assert.match(query, /version: "v1"/);
assert.match(query, /make_ids:/);
assert.match(query, /city_ids:/);
assert.match(query, /price_min:/);
assert.match(query, /has_photos:/);
assert.match(params, /parseCursor/);
assert.match(params, /encodeCursor/);
assert.match(params, /normalizeInteger/);
assert.match(params, /normalizeDecimal/);
assert.match(params, /isUuid/);
assert.match(params, /Object\.keys\(parsed\)/);
assert.match(client, /nextCursor/);
assert.match(client, /Next results/);
assert.doesNotMatch(client, /filterListings\(/);
assert.match(query, /Number\.isSafeInteger/);
assert.match(query, /engine_volume_min:/);

console.log("FUNCTIONAL-02D server search, URL cursor, and pagination wiring passed");
