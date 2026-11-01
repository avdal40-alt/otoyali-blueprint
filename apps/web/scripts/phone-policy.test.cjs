const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const market = fs.readFileSync(path.join(root, "src", "lib", "market.ts"), "utf8");
const runtime = fs.readFileSync(path.join(root, "src", "lib", "seller-phone-verification", "runtime.ts"), "utf8");
const clientPolicy = fs.readFileSync(path.join(root, "src", "lib", "seller-phone-verification", "client-policy.ts"), "utf8");

assert.match(market, /phonePolicy:/);
assert.match(market, /login: \{ allowedCountries: "any" \}/);
assert.match(market, /sellerContacts:\s*\{\s*enabled: true,\s*allowedCountries: \["KZ"\]/s, "KZ seller contacts must require a Kazakhstan +7 number without narrowing global login");
assert.match(market, /verificationPurpose: "kazakhstan_seller_contact"/);
assert.match(runtime, /allowedCountries as readonly string\[\]/);
assert.match(runtime, /policy\.verificationPurpose/);
assert.match(runtime, /policy\.verificationProvider/);
assert.doesNotMatch(runtime, /\+90|turkey_seller_contact/);
assert.match(clientPolicy, /parsed\.e164/);
console.log("phone-policy tests passed");
