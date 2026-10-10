const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.join(__dirname, "..", "src", "components", "seller", "SellerContactVerificationFlow.tsx");
const source = fs.readFileSync(sourcePath, "utf8");

assert.match(source, /export function SellerContactVerificationFlow/);
assert.match(source, /onVerified: \(\) => void \| Promise<void>/);
assert.match(source, /onCancel\?: \(\) => void/);
assert.doesNotMatch(source, /\buseEffect\b/);
assert.doesNotMatch(source, /resend/i);
assert.doesNotMatch(source, /\buser_id\b|\bseller_id\b/);

assert.match(source, /parseSellerContactPhone\(phone\)/);
assert.match(source, /JSON\.stringify\(\{ phone: parsedPhone \}\)/);
assert.match(source, /sellerContactPhonePlaceholder\(\)/);
assert.doesNotMatch(source, /\+90|nationalPhone|turkey-phone/);
assert.match(source, /fetch\("\/api\/seller\/phone-verification\/start"/);
assert.match(source, /fetch\("\/api\/seller\/phone-verification\/verify"/);
assert.equal((source.match(/phone-verification\/start/g) ?? []).length, 1);
assert.equal((source.match(/phone-verification\/verify/g) ?? []).length, 1);
assert.match(source, /body: JSON\.stringify\(\{ challengeId, code \}\)/);
assert.match(source, /Authorization: `Bearer \$\{accessToken\}`/);
assert.match(source, /await onVerified\(\);/);

const startFunction = source.slice(source.indexOf("async function startVerification"), source.indexOf("async function verifyCode"));
assert.ok(startFunction.indexOf("parseSellerContactPhone(phone)") < startFunction.indexOf("fetch(\"/api/seller/phone-verification/start\""));
assert.doesNotMatch(source, /sync_own_verified_account_phone|list_own_verified_seller_contact_phones/);

console.log("seller-contact-verification-flow: PASS");
