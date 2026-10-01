const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const exists = (...parts) => fs.existsSync(path.join(root, ...parts));

const registry = read("src", "features", "ai", "feature-registry.ts");
const stateMessage = read("src", "features", "ai", "components", "AiStateMessage.tsx");
const assistant = read("src", "features", "ai", "components", "AssistantPanel.tsx");
const sellAssistant = read("src", "app", "sell", "_components", "SellAssistant.tsx");
const priceRoute = read("src", "app", "api", "ai", "price", "route.ts");
const trustRoute = read("src", "app", "api", "ai", "trust", "route.ts");
const photoRoute = read("src", "app", "api", "ai", "photo", "route.ts");
const moderatorRuntime = read("src", "features", "ai", "moderation", "moderator-review-runtime.ts");
const moderatorDecision = read("src", "app", "api", "admin", "moderation", "[listingId]", "decision", "route.ts");
const priceCard = read("src", "components", "vehicle", "PriceIntelligenceCard.tsx");
const trustCard = read("src", "components", "vehicle", "TrustStatusCard.tsx");
const photoWizard = read("src", "app", "sell", "_components", "SellWizard.tsx");

assert.match(registry, /import "server-only"/);
assert.match(registry, /export function isAiFeatureEnabled/);
assert.match(registry, /process\.env\.AI_ENABLED/);
assert.match(registry, /process\.env\[`AI_\$\{feature\.slice\(3\)\.toUpperCase\(\)\}_ENABLED`\]/);
assert.match(stateMessage, /role=\{isError \? "alert" : "status"\}/);
assert.match(stateMessage, /aria-live=\{isError \? "assertive" : "polite"\}/);
assert.match(assistant, /AiStateMessage/);
assert.match(sellAssistant, /AiStateMessage/);

for (const source of [priceRoute, trustRoute, photoRoute, moderatorRuntime, moderatorDecision]) assert.ok(source.length > 0);
assert.match(trustRoute, /requireAuthenticatedRequestSupabase/);
assert.match(photoRoute, /requireAuthenticatedRequestSupabase/);
assert.match(moderatorDecision, /requireAuthenticatedRequestSupabase/);
assert.match(moderatorRuntime, /is_admin/);
assert.match(moderatorRuntime, /review_listing_moderation_with_override/);
assert.doesNotMatch(moderatorDecision + moderatorRuntime, /\.update\(|\.insert\(|\.delete\(|service_role|SUPABASE_SERVICE_ROLE/i);
assert.doesNotMatch(moderatorRuntime, /openai|executeListing|moderateListing/i);
assert.ok(!exists("src", "app", "api", "seller", "moderation"));

assert.match(photoWizard, /sanitizationStatus: "idle" \| "processing" \| "ready" \| "failed"/);
assert.match(photoWizard, /photo\.processingStatus !== "ready"/);
assert.doesNotMatch(photoWizard, /opt.?out|disable.?blur|unblurred fallback/i);
assert.doesNotMatch(priceCard, /fair market value|guaranteed sale price|overpriced|underpriced/i);
assert.doesNotMatch(trustCard, /trust score|private_vins|fingerprint|last4|raw.*vin/i);

const visibleSources = [assistant, sellAssistant, priceCard, trustCard, moderatorRuntime].join("\n");
assert.doesNotMatch(visibleSources, /normalized_vin|vin_fingerprint|raw_prompt|raw_response|plateText|qrPayload|service_role/i);

console.log("AI-01H2 final AI security and surface contract passed");
