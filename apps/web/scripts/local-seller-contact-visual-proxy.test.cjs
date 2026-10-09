const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "local-seller-contact-visual-proxy.cjs"), "utf8");
assert.match(source, /--listen-url/);
assert.match(source, /--target-url/);
assert.match(source, /requireLocalHttpUrl/);
assert.match(source, /phone-verification\/start/);
assert.match(source, /seller-contact/);
assert.match(source, /LOCAL_VISUAL_QA_INTERCEPT=otp-start/);
assert.match(source, /LOCAL_VISUAL_QA_INTERCEPT=contact-switch/);
assert.doesNotMatch(source, /54321|55421|SERVICE_ROLE|TWILIO_|access_token|refresh_token/);

console.log("local-seller-contact-visual-proxy: PASS");
