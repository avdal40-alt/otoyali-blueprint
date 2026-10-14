const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const boundary = read("src", "lib", "search", "search-service.ts");
const contract = read("src", "lib", "search", "search-contract.ts");
const webSearch = read("src", "lib", "search", "server-search.ts");
const searchClient = read("src", "app", "search", "_components", "SearchClient.tsx");
const aiSearch = read("src", "features", "ai", "search", "search-service.ts");
const priceSearch = read("src", "features", "ai", "price", "price-runtime.ts");

assert.match(contract, /type SearchService/, "the stable SearchService contract must be explicit");
assert.match(contract, /type SearchV1Request/, "the stable Search v1 request must be explicit");
assert.match(contract, /type SearchV1Response/, "the stable public response must be explicit");
assert.match(boundary, /schema\("marketplace"\)\.rpc\("search_listings_v1"/, "PostgreSQL remains the current Search v1 implementation");
assert.match(boundary, /PostgreSQL remains authoritative/, "a future secondary index cannot become the source of truth");
assert.doesNotMatch(boundary, /opensearch|elasticsearch|@opensearch/i, "no search platform is introduced without measured need");
assert.match(boundary, /import "server-only"/, "the PostgreSQL adapter remains server-only");
assert.match(searchClient, /search-request/, "the client uses only the shared request mapper");
assert.doesNotMatch(searchClient, /search\/server-search|search\/search-service/, "the client must not import server-only search modules");

for (const [name, source] of [["web", webSearch], ["AI", aiSearch], ["price", priceSearch]]) {
  assert.match(source, /createPostgresSearchService/, `${name} search uses the stable boundary`);
  assert.doesNotMatch(source, /\.rpc\("search_listings_v1"/, `${name} search does not bypass the stable boundary`);
}

console.log("JLC-1406 search scaling boundary contract passed");
