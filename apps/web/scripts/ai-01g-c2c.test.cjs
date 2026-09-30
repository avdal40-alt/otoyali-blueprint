const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const compile = (source) => {
  const module = { exports: {} };
  const output = ts.transpileModule(source.replace('import "server-only";\n', ""), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("exports", "module", output)(module.exports, module);
  return module.exports;
};

const policySource = read("src", "features", "ai", "moderation", "price-moderation.ts");
const mergeSource = read("src", "features", "ai", "moderation", "multimodal-merge.ts");
const runtime = read("src", "features", "ai", "moderation", "listing-moderation-runtime.ts");
const priceRuntime = read("src", "features", "ai", "price", "price-runtime.ts");
const priceEngine = read("src", "features", "ai", "price", "price-intelligence.ts");
const { evaluatePriceModeration } = compile(policySource);
const { mergeMultimodalSignals, multimodalActionFor } = compile(mergeSource);

const available = (patch = {}) => ({ available: true, currency: "TRY", comparableCount: 10, rawComparableCount: 10, usableComparableCount: 10, medianAskingPrice: 100_000, lowerObservedPrice: 90_000, upperObservedPrice: 110_000, targetPrice: 100_000, differenceFromMedian: 0, differencePercent: 0, relativePositionPercent: 50, coverage: "high", recency: "fresh", similarityTier: "strict", reasons: [], ...patch });
assert.equal(evaluatePriceModeration(available()), null);
assert.equal(evaluatePriceModeration(available({ targetPrice: 120_000, differenceFromMedian: 20_000, differencePercent: 20, relativePositionPercent: 100 })), null);
assert.equal(evaluatePriceModeration(available({ targetPrice: 80_000, differenceFromMedian: -20_000, differencePercent: -20, relativePositionPercent: 0 })), null);
assert.equal(evaluatePriceModeration(available({ targetPrice: 150_000, differenceFromMedian: 50_000, differencePercent: 50, relativePositionPercent: 100 })).code, "PRICE_ANOMALY");
assert.equal(evaluatePriceModeration(available({ targetPrice: 50_000, differenceFromMedian: -50_000, differencePercent: -50, relativePositionPercent: 0 })).code, "PRICE_ANOMALY");
assert.equal(evaluatePriceModeration({ available: false, reason: "insufficient_comparables", rawComparableCount: 2, usableComparableCount: 2 }), null);
assert.equal(evaluatePriceModeration(available({ coverage: "low" })), null);
assert.equal(evaluatePriceModeration(available({ recency: "older" })), null);
assert.equal(evaluatePriceModeration(available({ similarityTier: "model" })), null);

const contact = { code: "CONTACT_IN_IMAGE", field: "description", evidence: "[contact-overlay]", recommendedAction: "ask_edit" };
const duplicate = { code: "POSSIBLE_DUPLICATE_IMAGE", field: "description", evidence: "[exact-duplicate-image]", recommendedAction: "ask_edit" };
const mismatch = { code: "POSSIBLE_VEHICLE_MISMATCH", field: "description", evidence: "[possible-vehicle-mismatch]", recommendedAction: "review" };
const price = { code: "PRICE_ANOMALY", field: "description", evidence: "[price-outside-comparable-distribution]", recommendedAction: "review" };
assert.equal(multimodalActionFor([]), "allow");
assert.equal(multimodalActionFor([duplicate]), "ask_edit");
assert.equal(multimodalActionFor([contact, price]), "review");
assert.equal(multimodalActionFor([duplicate, mismatch]), "review");
assert.deepEqual(mergeMultimodalSignals([contact, price, contact]).map((signal) => signal.code), ["CONTACT_IN_IMAGE", "PRICE_ANOMALY"]);
assert.deepEqual(mergeMultimodalSignals([duplicate]), [duplicate]);

assert.match(runtime, /analyzePublicListingPrice/);
assert.match(runtime, /analyzeOwnListingImages/);
assert.match(runtime, /moderateListingWithContext/);
assert.match(runtime, /mergeMultimodalSignals/);
assert.match(runtime, /engine: "system"/);
assert.match(runtime, /PRICE_MODERATION_POLICY_VERSION/);
assert.doesNotMatch(runtime + policySource, /fraud|scam|auto.?ban|recommendedAction: "block"|\.update\(/i);
const persistencePayload = runtime.slice(runtime.indexOf('from("listing_moderation_signals")'));
assert.doesNotMatch(persistencePayload + policySource, /base64|raw_response|provider_payload|signedUrl|phone|vin|seller_id|storage\.objects/i);
assert.match(priceEngine, /candidate\.currency !== target\.currency/);
assert.match(priceEngine, /candidate\.condition !== target\.condition/);
assert.match(priceEngine, /isRecent\(candidate\.publishedAt/);
assert.match(priceRuntime, /listing_search_documents/);
console.log("AI-01G-C2C price policy and multimodal merge contract passed");
