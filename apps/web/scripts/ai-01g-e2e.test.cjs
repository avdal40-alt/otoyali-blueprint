const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{execFileSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const runtime=read("src/features/ai/moderation/moderator-review-runtime.ts"),ui=read("src/app/admin/_components/ModeratorReviewClient.tsx");
assert.match(runtime,/getModeratorQueue/);assert.match(runtime,/getModeratorReviewDetail/);assert.match(runtime,/review_listing_moderation_with_override/);assert.match(runtime,/latestByListing/);assert.match(runtime,/processed_status", "processed/);assert.match(runtime,/blur_status", "blurred/);assert.match(ui,/status===409/);assert.doesNotMatch(ui,/service_role|normalized_vin|vin_fingerprint|\bphone\b|raw_prompt|raw_response|signedUrl|plateText|qrPayload|\.update\(|\.insert\(/i);
const output=execFileSync(process.execPath,[path.join(__dirname,"ai-01g-d1a.test.cjs")],{encoding:"utf8"});assert.match(output,/15 checks/);
console.log("AI-01G deterministic moderation E2E passed: auth, approve, reject, stale, conflict, rollback, history, queue/detail contract, and sanitized-only UI boundary.");
