const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const market = fs.readFileSync(path.join(root, "src", "lib", "market.ts"), "utf8");
const runtime = fs.readFileSync(path.join(root, "src", "lib", "seller-phone-verification", "runtime.ts"), "utf8");
const clientPolicy = fs.readFileSync(path.join(root, "src", "lib", "seller-phone-verification", "client-policy.ts"), "utf8");

assert.match(market, /phonePolicy:/);
assert.match(market, /login: \{ allowedCountries: "any" \}/);
assert.match(market, /sellerContacts: \{ enabled: false \}/, "planned KZ profile must not inherit Turkey seller-contact support");
assert.match(runtime, /allowedCountries as readonly string\[\]/);
assert.match(runtime, /policy\.verificationPurpose/);
assert.match(runtime, /policy\.verificationProvider/);
assert.doesNotMatch(runtime, /\+90|turkey_seller_contact/);
assert.match(clientPolicy, /parsed\.e164/);
console.log("phone-policy tests passed");
