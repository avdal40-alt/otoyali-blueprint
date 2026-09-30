const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const runtime = fs.readFileSync(path.join(root, "src/features/ai/moderation/moderator-review-runtime.ts"), "utf8");
const queue = fs.readFileSync(path.join(root, "src/app/api/admin/moderation/route.ts"), "utf8");
const detail = fs.readFileSync(path.join(root, "src/app/api/admin/moderation/[listingId]/route.ts"), "utf8");
const decision = fs.readFileSync(path.join(root, "src/app/api/admin/moderation/[listingId]/decision/route.ts"), "utf8");
const source = [runtime, queue, detail, decision].join("\n");

assert.match(runtime, /MAX_QUEUE_LIMIT = 50/);
assert.match(runtime, /recommended_action", "review/);
assert.match(runtime, /latestByListing/);
assert.match(runtime, /listing_moderation_overrides/);
assert.match(runtime, /processed_status", "processed/);
assert.match(runtime, /blur_status", "blurred/);
assert.match(runtime, /review_listing_moderation_with_override/);
assert.match(runtime, /OT409/);
assert.match(runtime, /is_admin/);
assert.match(queue, /requireAuthenticatedRequestSupabase/);
assert.match(detail, /requireAuthenticatedRequestSupabase/);
assert.match(decision, /requireAuthenticatedRequestSupabase/);
assert.match(decision, /export async function POST/);
assert.doesNotMatch(source, /service_role|SUPABASE_SERVICE|\.update\(|\.insert\(|\.delete\(|normalized_vin|vin_fingerprint|\bphone\b|raw_prompt|raw_response|signedUrl|plateText|qrPayload/i);
assert.doesNotMatch(runtime, /openai|executeListing|moderateListing/i);
console.log("AI-01G-D1B moderator runtime contract passed");
