const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const config = read("src", "features", "ai", "config.ts");
const capabilities = read("src", "features", "ai", "domain", "capabilities.ts");
const intents = read("src", "features", "ai", "domain", "intents.ts");
const service = read("src", "features", "ai", "search", "search-service.ts");
const searchService = read("src", "lib", "search", "search-service.ts");
const intent = read("src", "features", "ai", "search", "search-intent.ts");
const actions = read("src", "features", "ai", "domain", "actions.ts");
const registry = read("src", "features", "ai", "tools", "registry.ts");

assert.match(config, /"natural_language_search"/, "local preview enables the approved search capability");
assert.match(capabilities, /capability\("natural_language_search", "local_preview", \["cars"\]\)/);
assert.match(intents, /intent\("search_vehicles"[\s\S]*?"local_preview"/);

assert.match(service, /createPostgresSearchService/, "AI search uses the shared public search-domain boundary");
assert.match(searchService, /search_listings_v1/, "the shared search boundary uses only the canonical public Search v1 RPC");
assert.match(service, /type PublicSearchItem/, "search response is reduced to an explicit public DTO");
assert.doesNotMatch(service, /seller_contact|phone|auth\.users|service_role|saved_search/i, "search executor has no private-contact or identity access");
assert.match(intent, /searchIntentSchema/, "typed, bounded search criteria are validated");
assert.match(intent, /mapSearchIntentToSearchV1/, "typed criteria map to the canonical search contract");
assert.match(intent, /\.strict\(\)/, "search input rejects undeclared fields");

assert.match(service, /createAssistantAction\("open_search"/, "search results provide an allow-listed search action");
assert.match(service, /createAssistantAction\("view_listing"/, "search results provide allow-listed listing actions");
assert.match(actions, /normalizeInternalHref/, "all actions are normalized to internal allow-listed URLs");
assert.match(actions, /allowedQueryKeys/, "search action query keys are allow-listed");
assert.match(registry, /search.*listing.*catalog.*video/s, "AI tool registry excludes private tools");
assert.doesNotMatch(registry, /seller.?contact|saved.?search|service_role|rpc\(/i);

console.log("JLC-1003 AI natural-language search contract passed");
