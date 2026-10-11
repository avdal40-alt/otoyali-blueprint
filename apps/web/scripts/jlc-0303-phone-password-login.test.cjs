const assert = require("node:assert/strict");
const { execSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const webRoot = path.resolve(__dirname, "..");
const loginSource = fs.readFileSync(path.join(webRoot, "src", "app", "login", "_components", "LoginClient.tsx"), "utf8");

assert.match(loginSource, /signInWithPassword\(\{ phone: parsed\.e164, password \}\)/);
assert.doesNotMatch(loginSource, /signInWithOtp/);
assert.match(loginSource, /localizePath\(safeNextPath\(searchParams\.get\("next"\), "\/profile"\), locale\)/);

if (process.env.JLC_PHONE_LOGIN_RUNTIME !== "1") {
  console.log("PASS JLC-0303 phone/password login source contract");
  process.exit(0);
}

const output = execSync("npx supabase status -o env", { cwd: repositoryRoot, encoding: "utf8" });
const env = Object.fromEntries([...output.matchAll(/^(\w+)="([^"]*)"$/gm)].map(([, key, value]) => [key, value]));
assert.ok(env.API_URL && env.ANON_KEY && env.SERVICE_ROLE_KEY, "local Supabase Auth credentials must be available");

const service = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const anonymous = createClient(env.API_URL, env.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const id = randomUUID();
const phoneSuffix = [...id.replaceAll("-", "")].map((character) => (character.charCodeAt(0) % 10).toString()).join("").slice(0, 7);
const phone = `+7701${phoneSuffix}`;
const password = `Local-${id}-A9!`;

(async () => {
  try {
    const { error: createError } = await service.auth.admin.createUser({ id, phone, password, phone_confirm: true });
    assert.ifError(createError);

    const { data: signedIn, error: signInError } = await anonymous.auth.signInWithPassword({ phone, password });
    assert.ifError(signInError);
    assert.equal(signedIn.user?.id, id, "phone/password sign-in must authenticate the enrolled user");
    assert.ok(signedIn.session?.access_token, "phone/password sign-in must issue a session");

    await anonymous.auth.signOut();
    const { data: rejected, error: rejectedError } = await anonymous.auth.signInWithPassword({ phone, password: `${password}-wrong` });
    assert.ok(rejectedError, "invalid credentials must be rejected");
    assert.equal(rejected.session, null, "invalid credentials must not issue a session");

    console.log("PASS JLC-0303 local phone/password login runtime");
  } finally {
    await service.auth.admin.deleteUser(id);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
