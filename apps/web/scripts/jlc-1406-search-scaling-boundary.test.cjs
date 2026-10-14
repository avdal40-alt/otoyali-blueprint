const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const boundary = read("src", "lib", "search", "search-service.ts");
const webSearch = read("src", "lib", "search", "server-search.ts");
const aiSearch = read("src", "features", "ai", "search", "search-service.ts");
const priceSearch = read("src", "features", "ai", "price", "price-runtime.ts");

assert.match(boundary, /type SearchService/, "the stable SearchService contract must be explicit");
assert.match(boundary, /type SearchV1Request/, "the stable Search v1 request must be explicit");
assert.match(boundary, /type SearchV1Response/, "the stable public response must be explicit");
assert.match(boundary, /schema\("marketplace"\)\.rpc\("search_listings_v1"/, "PostgreSQL remains the current Search v1 implementation");
assert.match(boundary, /PostgreSQL remains authoritative/, "a future secondary index cannot become the source of truth");
assert.doesNotMatch(boundary, /opensearch|elasticsearch|@opensearch/i, "no search platform is introduced without measured need");

for (const [name, source] of [["web", webSearch], ["AI", aiSearch], ["price", priceSearch]]) {
  assert.match(source, /createPostgresSearchService/, `${name} search uses the stable boundary`);
  assert.doesNotMatch(source, /\.rpc\("search_listings_v1"/, `${name} search does not bypass the stable boundary`);
}

console.log("JLC-1406 search scaling boundary contract passed");
