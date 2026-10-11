const assert = require("node:assert/strict");
const { execSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const output = execSync("npx supabase status -o env", { cwd: path.resolve(__dirname, "../../.."), encoding: "utf8" });
const env = Object.fromEntries([...output.matchAll(/^(\w+)="([^"]*)"$/gm)].map(([, key, value]) => [key, value]));
assert.ok(env.API_URL && env.ANON_KEY && env.SERVICE_ROLE_KEY, "local Supabase Auth credentials must be available");

const service = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(env.API_URL, env.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const id = randomUUID();
const password = `Local-${id}-A9!`;
const email = `jlc-0302-${id}@example.test`;

(async () => {
  try {
    const { error: createError } = await service.auth.admin.createUser({ id, email, password, email_confirm: true });
    assert.ifError(createError);

    const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: "magiclink", email });
    assert.ifError(linkError);
    const { data: signedIn, error: verifyError } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
    assert.ifError(verifyError);
    assert.ok(signedIn.session?.access_token, "local Auth must issue a JWT for the authenticated actor");

    const before = await anon.rpc("get_own_password_enrollment_status");
    assert.ifError(before.error);
    assert.deepEqual(before.data, [{ password_enrolled: false, password_enrolled_at: null }]);

    const complete = await anon.rpc("complete_own_password_enrollment", { p_enrollment_method: "registration" });
    assert.ifError(complete.error);
    assert.equal(complete.data?.[0]?.password_enrolled, true);

    const after = await anon.rpc("get_own_password_enrollment_status");
    assert.ifError(after.error);
    assert.equal(after.data?.[0]?.password_enrolled, true);
    assert.ok(after.data?.[0]?.password_enrolled_at, "authenticated actor must receive its own enrollment timestamp");

    const unauthenticated = createClient(env.API_URL, env.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const denied = await unauthenticated.rpc("complete_own_password_enrollment", { p_enrollment_method: "registration" });
    assert.ok(denied.error, "anonymous callers must not mark password enrollment");
    console.log("PASS JLC-0302 local Auth/JWT password enrollment runtime");
  } finally {
    await service.auth.admin.deleteUser(id);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
