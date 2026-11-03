const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const providerPage = read("src", "app", "servisler", "[slug]", "page.tsx");
const query = read("src", "lib", "queries", "services.ts");
const foundation = read("..", "..", "supabase", "migrations", "20260718120000_service01_service_marketplace_foundation.sql");
const reviewHardening = read("..", "..", "supabase", "migrations", "20260719150000_service01_review_security_hardening.sql");

assert.match(providerPage, /provider\.website_url/);
assert.match(providerPage, /target="_blank"/);
assert.match(providerPage, /rel="noopener noreferrer"/);
assert.match(providerPage, /services\.contact\.visitWebsite/);
assert.match(providerPage, /services\.contact\.unavailable/);
assert.doesNotMatch(providerPage, /requestSoon/);
assert.match(query, /\.from\("service_public_providers"\)/);
assert.match(query, /\.from\("service_public_provider_details"\)/);
assert.doesNotMatch(query, /provider_applications|contact_phone|owner_id/);
assert.match(foundation, /CREATE POLICY service_providers_public_select_active[\s\S]*USING \(status = 'active'\)/);
assert.match(foundation, /CREATE POLICY service_provider_applications_select_own[\s\S]*submitter_id = auth\.uid\(\)/);
assert.match(reviewHardening, /IF NOT public\.is_admin\(v_user_id\) THEN[\s\S]*OT403/);
assert.match(reviewHardening, /illegal service provider application status transition/);
assert.doesNotMatch(providerPage + query, /booking.*payment|payment.*booking|reservation/i);
console.log("JLC-1603 services discovery, safe website contact, and moderation contracts passed.");
