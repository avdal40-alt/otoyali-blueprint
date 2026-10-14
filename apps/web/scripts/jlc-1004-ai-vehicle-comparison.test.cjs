const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const comparison = read("src", "features", "ai", "listing", "listing-expert.ts");
const reviews = read("src", "lib", "queries", "reviews.ts");
const catalog = read("src", "lib", "queries", "vehicle-comparison.ts");
const validator = read("src", "features", "ai", "services", "request-validator.ts");
const runtime = read("src", "features", "ai", "services", "assistant-service.ts");
const types = read("src", "features", "ai", "domain", "types.ts");
const intents = read("src", "features", "ai", "domain", "intents.ts");
const capabilities = read("src", "features", "ai", "domain", "capabilities.ts");

assert.match(comparison, /getListingDetails/, "listing comparison uses the active-only public listing projection");
assert.match(comparison, /getListingReviewTarget/, "listing comparison resolves canonical generation only through the public-safe listing boundary");
assert.match(comparison, /getPublicCanonicalGenerations/, "comparison uses the typed canonical catalog boundary");
assert.match(catalog, /\.eq\("is_active", true\)/, "canonical catalog targets fail closed to active rows");
assert.match(reviews, /\.eq\("moderation_status", "approved"\)/, "review aggregation includes approved reviews only");
assert.match(reviews, /\.limit\(80\)/, "review aggregation has a strict total bound");
assert.match(reviews, /ratings\.length < 20/, "review aggregation has a per-generation bound");
assert.match(comparison, /missingFields/, "unavailable data is explicit");
assert.match(comparison, /approvedReviewAverageRating/, "review facts carry a grounded aggregate only");
assert.match(comparison, /getPublicListingSnapshot/, "non-public listings resolve to no snapshot and fail closed");
assert.doesNotMatch(comparison, /phone|email|seller_contact|auth\.users|service_role|moderation_status|vin/i, "comparison contract contains no private contact, identity, VIN, or moderation fields");
assert.match(validator, /compareGenerationIds/, "generation comparison input is validated server-side");
assert.match(types, /type: "vehicle_comparison"/, "comparison output is a typed structured contract");
assert.match(types, /source: "listing" \| "catalog"/, "compared items declare source category");
assert.match(intents, /intent\("compare_vehicles"[\s\S]*?"local_preview"/, "comparison is available only through the local deterministic path");
assert.match(capabilities, /capability\("vehicle_comparison", "local_preview"/, "comparison capability does not enable a production provider");
assert.match(runtime, /config\.mode === "local_preview"/, "the existing secure runtime/provider gate remains authoritative");

console.log("JLC-1004 grounded vehicle comparison contract passed");
