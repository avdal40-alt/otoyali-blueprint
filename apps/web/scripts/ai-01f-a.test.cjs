const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const enginePath = path.join(root, "src", "features", "ai", "price", "price-intelligence.ts");
const source = fs.readFileSync(enginePath, "utf8");
const moduleValue = { exports: {} };
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
new Function("exports", "module", compiled)(moduleValue.exports, moduleValue);
const { calculatePriceIntelligence } = moduleValue.exports;
const now = new Date("2026-09-28T12:00:00.000Z");

const target = vehicle({ listingId: "target", priceAmount: 120_000 });
const comparable = (listingId, priceAmount, patch = {}) => vehicle({ listingId, priceAmount, ...patch });
const result = (tiers) => calculatePriceIntelligence(target, tiers, now);
const strict = (candidates) => [{ id: "strict", candidates }];

const baseline = strict([comparable("a", 100_000), comparable("b", 120_000), comparable("c", 140_000)]);
const median = result(baseline);
assert.equal(median.available, true);
assert.equal(median.medianAskingPrice, 120_000);
assert.equal(median.lowerObservedPrice, 100_000);
assert.equal(median.upperObservedPrice, 140_000);
assert.equal(median.rawComparableCount, 3);
assert.equal(median.usableComparableCount, 3);

const below = calculatePriceIntelligence(vehicle({ listingId: "below", priceAmount: 90_000 }), baseline, now);
const above = calculatePriceIntelligence(vehicle({ listingId: "above", priceAmount: 150_000 }), baseline, now);
assert.equal(below.available && below.differenceFromMedian, -30_000);
assert.equal(above.available && above.differenceFromMedian, 30_000);
assert.equal(median.available && median.differenceFromMedian, 0);

const withOutlier = result(strict([comparable("o1", 100_000), comparable("o2", 110_000), comparable("o3", 120_000), comparable("o4", 130_000), comparable("outlier", 1_000_000)]));
assert.equal(withOutlier.available, true);
assert.equal(withOutlier.usableComparableCount, 4);
assert.equal(withOutlier.available && withOutlier.reasons.includes("outliers_excluded"), true);

assert.equal(result(strict([comparable("only-one", 100_000), comparable("only-two", 110_000)])).available, false);
const zeroKmTarget = vehicle({ listingId: "zero-km", condition: "new", priceAmount: 120_000 });
assert.equal(calculatePriceIntelligence(zeroKmTarget, strict([comparable("used", 100_000), comparable("used2", 110_000), comparable("used3", 120_000)]), now).available, false);
assert.equal(result(strict([comparable("make", 100_000, { makeId: "other" }), comparable("model", 110_000, { modelId: "other" }), comparable("private", 120_000, { publicEligible: false })])).available, false);
assert.equal(result(strict([comparable("target", 100_000), comparable("stale", 110_000, { publishedAt: "2024-01-01T00:00:00.000Z" }), comparable("usd", 120_000, { currency: "USD" })])).available, false);

const expanded = result([
  { id: "strict", candidates: [comparable("strict-body-mismatch", 100_000, { bodyType: "suv" })] },
  { id: "expanded", candidates: [comparable("e1", 100_000, { bodyType: "suv" }), comparable("e2", 110_000, { bodyType: "suv" }), comparable("e3", 120_000, { bodyType: "suv" })] }
]);
assert.equal(expanded.available && expanded.similarityTier, "expanded");

const deterministicOne = result(baseline);
const deterministicTwo = result(baseline);
assert.deepEqual(deterministicOne, deterministicTwo);

const route = fs.readFileSync(path.join(root, "src", "app", "api", "ai", "price", "route.ts"), "utf8");
const runtime = fs.readFileSync(path.join(root, "src", "features", "ai", "price", "price-runtime.ts"), "utf8");
assert.match(route, /z\.object\(\{ listingId: z\.string\(\)\.uuid\(\) \}\)\.strict\(\)/);
assert.match(route, /isAiFeatureEnabled\("ai_price"\)/);
assert.match(route, /getAiRateLimiter/);
assert.match(runtime, /rpc\("search_listings_v1"/);
assert.match(runtime, /listing_search_documents/);
assert.doesNotMatch(source + route + runtime, /openai|service_role|seller_id|phone|email|vin|moderation|private/i);
console.log("AI-01F-A deterministic price intelligence contract passed");

function vehicle(overrides = {}) {
  return {
    listingId: "listing", makeId: "make", modelId: "model", condition: "used", year: 2022, mileageKm: 50_000,
    fuel: "gasoline", transmission: "automatic", bodyType: "sedan", currency: "TRY", priceAmount: 100_000,
    publishedAt: "2026-09-01T00:00:00.000Z", publicEligible: true, ...overrides
  };
}
