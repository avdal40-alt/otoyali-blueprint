const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const market = read("apps", "web", "src", "lib", "market.ts");
const gate = read("apps", "web", "src", "app", "sell", "_components", "SellerEntryGate.tsx");
const wizard = read("apps", "web", "src", "app", "sell", "_components", "SellWizard.tsx");
const eligibility = read("apps", "web", "src", "app", "api", "seller", "eligibility", "route.ts");
const runtime = read("apps", "web", "src", "lib", "seller-phone-verification", "runtime.ts");
const migration = read("supabase", "migrations", "20261101130000_jlc_0524_kazakhstan_seller_phone_eligibility.sql");

// Global account identity remains portable: neither registration nor normal
// login is tied to Kazakhstan. KZ is only the seller-contact policy.
assert.match(market, /login: \{ allowedCountries: "any" \}/);
assert.match(market, /sellerContacts:\s*\{\s*enabled: true,\s*allowedCountries: \["KZ"\]/s);
assert.match(market, /verificationPurpose: "kazakhstan_seller_contact"/);
assert.match(market, /callingCode: "\+7"/);

// Browser state is presentation only; it must consume the market-filtered RPC.
for (const source of [gate, wizard]) {
  assert.match(source, /list_own_kazakhstan_seller_contact_phones/);
  assert.doesNotMatch(source, /list_own_verified_seller_contact_phones/);
}
assert.match(eligibility, /is_kazakhstan_seller_phone_verified/);

// Reusing an active verified contact never reaches the provider.
assert.match(runtime, /has_active_seller_contact_phone_service/);
assert.match(runtime, /existing\.data === true\) return \{ ok: true, status: "already_verified" \}/);
assert.match(runtime, /challenge\.outcome === "already_verified"/);
assert.match(runtime, /p_purpose: policy\.verificationPurpose/);
assert.match(runtime, /p_provider: policy\.verificationProvider/);

// The durable boundary requires an owned, active Kazakhstan-numbering contact
// (not merely any shared-zone +7 number) for create, contact selection,
// submit, and resubmit. It also prevents direct use of the legacy
// private-draft wrapper by authenticated callers.
assert.match(migration, /CREATE FUNCTION identity\.require_kazakhstan_seller_contact_phone/);
assert.match(migration, /CREATE FUNCTION identity\.is_kazakhstan_e164_phone/);
assert.match(migration, /\^\[\+\]7\(\?:0\|6\|7\)\[0-9\]\{9\}\$/);
assert.equal((migration.match(/identity\.is_kazakhstan_e164_phone\(contact\.phone_e164\)/g) ?? []).length, 3, "all protected KZ seller-contact surfaces must share the country helper");
assert.doesNotMatch(migration, /contact\.phone_e164 ~ '\^\[\+\]7\[0-9\]\{10\}\$'/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.create_own_listing_draft_v2[\s\S]*?require_kazakhstan_seller_contact_phone/s);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.set_own_listing_seller_contact_phone[\s\S]*?require_kazakhstan_seller_contact_phone/s);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.submit_own_listing_for_review[\s\S]*?require_kazakhstan_seller_contact_phone/s);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.resubmit_own_listing_for_review[\s\S]*?require_kazakhstan_seller_contact_phone/s);
assert.match(migration, /REVOKE EXECUTE ON FUNCTION public\.create_own_private_listing_draft[\s\S]*?FROM authenticated/s);
assert.match(migration, /CREATE FUNCTION public\.list_own_kazakhstan_seller_contact_phones/);
assert.match(migration, /CREATE FUNCTION public\.is_kazakhstan_seller_phone_verified/);
assert.match(migration, /CREATE FUNCTION public\.has_active_seller_contact_phone_service/);

// No change is permitted to Auth provider settings or historical rows.
assert.doesNotMatch(migration, /UPDATE\s+auth\.users/i);
assert.doesNotMatch(migration, /DELETE\s+FROM\s+(?:identity\.)?verified_seller_contact_phones/i);
assert.doesNotMatch(migration, /UPDATE\s+marketplace\.listings\s+AS\s+listing\s+SET\s+(?:city_id|currency|seller_id)/i);

console.log("seller-country-phone-eligibility: PASS");
