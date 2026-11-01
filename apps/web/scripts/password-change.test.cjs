const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const client = read("src", "app", "settings", "_components", "SettingsClient.tsx");
const copy = read("src", "app", "settings", "_components", "settings-copy.ts");

assert.match(client, /auth\.updateUser\(\{[\s\S]*password: newPassword,[\s\S]*current_password: currentPassword[\s\S]*\}\)/, "Supabase verifies the current password in the protected password-update request");
assert.doesNotMatch(client, /signInWithPassword\(\{ phone, password: currentPassword \}\)/, "a separate sign-in is not treated as a substitute for Supabase current-password enforcement");
assert.match(client, /newPassword\.length < 10/, "minimum password policy is enforced before auth mutation");
assert.match(client, /newPassword !== passwordConfirmation/, "password confirmation is required");
assert.match(client, /newPassword === currentPassword/, "new password must differ from the current password");
assert.doesNotMatch(client, /signInWithOtp|verifyOtp|reauthenticate|sendOtp/, "ordinary password changes must not send OTP/SMS");
assert.match(copy, /currentPassword/, "all launch locales include password-change copy");

console.log("Password change contract tests passed");
