const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const wizard = read("src", "app", "sell", "_components", "SellWizard.tsx");
const copy = read("src", "app", "sell", "sell-copy.ts");
const route = read("src", "app", "api", "listings", "[id]", "media", "route.ts");

assert.match(wizard, /sanitizationStatus: "idle" \| "processing" \| "ready" \| "failed"/);
assert.match(wizard, /blurredRegionCount: number \| null/);
assert.match(wizard, /sanitizationStatus: "processing"/);
assert.match(wizard, /sanitizationStatus: "ready"/);
assert.match(wizard, /sanitizationStatus: "failed"/);
assert.match(wizard, /copy\.photoProtecting/);
assert.match(wizard, /copy\.photoProtected\(mediaResult\.data\.blurredRegionCount\)/);
assert.match(wizard, /photo\.blurredRegionCount \?\? 0/);
assert.match(wizard, /role="status" aria-live="polite"/);
assert.match(wizard, /photo\.processingStatus !== "ready"/);
assert.match(wizard, /photo\.uploadStatus === "uploading"/);
assert.match(wizard, /temp\/\$\{userId\}\/\$\{mediaId\}/);
assert.doesNotMatch(wizard, /service_role|SUPABASE_SERVICE_ROLE|signedUrl|plateText|plate_text|boundingBox|coordinates/i);
assert.match(copy, /photoProtecting/);
assert.match(copy, /photoProtected/);
assert.doesNotMatch(copy, /Orijinal dosya güvenli yedek olarak kullanılacak|original file will be used as a safe fallback/i);
assert.match(route, /blurredRegionCount: processed\.blurredRegionCount/);
assert.doesNotMatch(route, /plateText|plate_text|coordinates|signedUrl/i);

console.log("AI-01E-B2 seller photo intelligence UX contract passed");
