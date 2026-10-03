const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const web = path.join(root, "apps", "web");
const read = (...parts) => fs.readFileSync(path.join(web, ...parts), "utf8");
const gate = read("src", "app", "sell", "_components", "SellerEntryGate.tsx");
const page = read("src", "app", "sell", "page.tsx");
const eligibility = read("src", "app", "api", "seller", "eligibility", "route.ts");
const start = read("src", "app", "api", "seller", "phone-verification", "start", "route.ts");
const verify = read("src", "app", "api", "seller", "phone-verification", "verify", "route.ts");
const otpInput = read("src", "components", "auth", "OtpInput.tsx");
const tr = read("src", "i18n", "dictionaries", "tr.ts");
const en = read("src", "i18n", "dictionaries", "en.ts");

// The sole status boundary derives identity from the bearer token and returns no phone or private verification data.
assert.match(eligibility, /requireAuthenticatedRequestSupabase/);
assert.match(eligibility, /is_turkey_seller_phone_verified/);
assert.match(eligibility, /data: \{ eligible: data === true \}/);
assert.doesNotMatch(eligibility, /seller_phone_verifications|challenge|phone_e164|userId.*request\./);

// Create flow cannot mount the wizard until the gate reaches canonical eligibility; edit/resubmit remains untouched.
assert.match(page, /<SellerEntryGate>[\s\S]*<SellWizard mode="create"/);
assert.match(page, /<SellWizard mode="editRejected"/);
assert.match(gate, /if \(state === "eligible"\) return <>\{children\}<\/>/);
assert.match(gate, /fetch\("\/api\/seller\/eligibility"/);
assert.match(gate, /setState\(body\.data\.eligible \? "eligible" : "phone"\)/);
assert.match(gate, /if \(!accessToken\) \{[\s\S]*redirectToLogin\(\)/);
assert.match(gate, /if \(response\.status === 401\) \{[\s\S]*redirectToLogin\(\)/);
assert.doesNotMatch(gate, /createOwnListingDraft|\/api\/listings/);

// The existing authenticated B1 routes are the only OTP routes used by the gate; successful verification rechecks eligibility.
assert.match(start, /requireAuthenticatedRequestSupabase/);
assert.match(verify, /requireAuthenticatedRequestSupabase/);
assert.match(gate, /\/api\/seller\/phone-verification\/start/);
assert.match(gate, /\/api\/seller\/phone-verification\/verify/);
assert.match(gate, /await checkEligibility\(\);/);
assert.match(gate, /if \(!response\.ok\) \{[\s\S]*setState\([^\n]+"otp"\)/);
assert.doesNotMatch(gate, /signInWithOtp|verifyOtp|updateUser|twilio|identity\.seller_phone/);

// Turkey formatting is presentation-only; auth phone remains untouched and no browser persistence can grant eligibility.
assert.match(gate, /phone: `\+90\$\{phone\}`/);
assert.match(gate, /sellerPhoneAuthIndependent/);
assert.doesNotMatch(gate, /localStorage|sessionStorage|document\.cookie|verified=true|searchParams\.get\("verified"/);

// Error and accessibility contracts are explicit for wrong/expired/rate-limited/unavailable states.
for (const state of ["rateLimited", "providerUnavailable", "challenge_unavailable", "invalid_code", "aria-live"]) {
  assert.ok(gate.includes(state), `missing seller gate state or accessibility contract: ${state}`);
}
assert.match(otpInput, /autoComplete="one-time-code"/);
for (const key of ["sellerPhoneTitle", "sellerPhoneBody", "sellerPhoneInvalid", "sellerPhoneRateLimited", "sellerPhoneExpired", "sellerPhoneInvalidCode", "sellerPhoneUnavailable"]) {
  assert.ok(tr.includes(`${key}:`), `missing Turkish seller verification key: ${key}`);
  assert.ok(en.includes(`${key}:`), `missing English seller verification key: ${key}`);
}

console.log("PASS SELL-SEC-04C2A seller entry eligibility gate contract");
