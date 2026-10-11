const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const forgotPasswordPage = read("apps", "web", "src", "app", "auth", "forgot-password", "page.tsx");
const otpStart = read("apps", "web", "src", "components", "auth", "AuthOtpStartClient.tsx");
const otpClient = read("apps", "web", "src", "app", "otp", "_components", "OtpClient.tsx");
const login = read("apps", "web", "src", "app", "login", "_components", "LoginClient.tsx");
const contactFlow = read("apps", "web", "src", "components", "seller", "SellerContactVerificationFlow.tsx");

assert.match(forgotPasswordPage, /<AuthOtpStartClient purpose="recovery"\s*\/>/);
assert.match(otpStart, /shouldCreateUser: purpose === "registration"/);

const verifyFlow = otpClient.slice(otpClient.indexOf("async function verify()"), otpClient.indexOf("async function resend()"));
assert.match(verifyFlow, /auth\.verifyOtp\(\{ phone: transaction\.phone, token, type: "sms" \}\)/);
assert.match(verifyFlow, /if \(transaction\.purpose === "recovery"\)/);
assert.match(verifyFlow, /auth\/reset-password\?next=/);
assert.doesNotMatch(verifyFlow, /signInWithOtp/);

const resendStart = otpClient.indexOf("async function resend()");
const resendFlow = otpClient.slice(resendStart, otpClient.indexOf("return (", resendStart));
assert.match(resendFlow, /if \(resendRemainingSeconds > 0\) \{\s*return;/);
assert.match(resendFlow, /auth\.signInWithOtp/);
assert.match(otpClient, /<Button onClick=\{resend\}/);
assert.doesNotMatch(otpClient, /useEffect\(\(\) => \{[\s\S]{0,1000}\bvoid resend\(\)/);

assert.match(login, /signInWithPassword\(\{ phone: parsed\.e164, password \}\)/);
assert.doesNotMatch(login, /signInWithOtp/);

assert.match(contactFlow, /onSubmit=\{\(event\) => \{ event\.preventDefault\(\); void startVerification\(\); \}\}/);
assert.match(contactFlow, /fetch\("\/api\/seller\/phone-verification\/start"/);
assert.match(contactFlow, /fetch\("\/api\/seller\/phone-verification\/verify"/);
assert.match(contactFlow, /Authorization: `Bearer \$\{accessToken\}`/);
assert.equal((contactFlow.match(/phone-verification\/start/g) ?? []).length, 1);
assert.equal((contactFlow.match(/phone-verification\/verify/g) ?? []).length, 1);
assert.doesNotMatch(contactFlow, /\buseEffect\b|resend/i);

console.log("PASS JLC-0304 recovery and explicit OTP boundary contracts");
