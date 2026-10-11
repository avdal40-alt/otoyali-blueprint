const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const registerPage = read("apps", "web", "src", "app", "register", "page.tsx");
const otpStart = read("apps", "web", "src", "components", "auth", "AuthOtpStartClient.tsx");
const otpClient = read("apps", "web", "src", "app", "otp", "_components", "OtpClient.tsx");
const passwordEnrollment = read("apps", "web", "src", "components", "auth", "PasswordEnrollmentClient.tsx");
const login = read("apps", "web", "src", "app", "login", "_components", "LoginClient.tsx");
const migration = read("supabase", "migrations", "20261008124500_complete_own_password_enrollment.sql");

assert.match(registerPage, /<AuthOtpStartClient purpose="registration" \/>/);
assert.match(otpStart, /signInWithOtp\(\{ phone: parsed\.e164, options: \{ shouldCreateUser: purpose === "registration"/);

const verifyFlow = otpClient.slice(otpClient.indexOf("async function verify()"), otpClient.indexOf("async function resend()"));
assert.match(verifyFlow, /auth\.verifyOtp\(\{ phone: transaction\.phone, token, type: "sms" \}\)/);
assert.doesNotMatch(verifyFlow, /signInWithOtp/);
assert.match(verifyFlow, /getPasswordEnrollmentStatus\(supabase\)/);
assert.match(verifyFlow, /if \(enrollment\.error \|\| !enrollment\.enrolled\)/);
assert.match(verifyFlow, /auth\/create-password\?next=\$\{encodeURIComponent\(next\)\}&method=\$\{transaction\.purpose\}/);

assert.match(passwordEnrollment, /auth\.updateUser\(\{ password \}\)[\s\S]*completePasswordEnrollment\(supabase, method\)/);
assert.match(login, /signInWithPassword\(\{ phone: parsed\.e164, password \}\)/);
assert.doesNotMatch(login, /signInWithOtp/);

assert.match(migration, /DECLARE v_user_id UUID := auth\.uid\(\)/);
assert.match(migration, /IF v_user_id IS NULL THEN[\s\S]*authentication required/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.complete_own_password_enrollment\(TEXT\) FROM PUBLIC, anon, service_role, authenticated/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.complete_own_password_enrollment\(TEXT\) TO authenticated/);

console.log("PASS JLC-0302 registration OTP-to-password enrollment contract");
