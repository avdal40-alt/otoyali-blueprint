const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID, createHmac } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
const fixturePhone = (userId) => `+905${userId.replace(/\D/g, "").padEnd(9, "0").slice(0, 9)}`;
const fixtureReference = "test-b0a-reference";
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const secret = execFileSync("docker", ["inspect", "-f", "{{range .Config.Env}}{{println .}}{{end}}", "supabase_auth_Otoyali-blueprint"], { encoding: "utf8" }).split(/\r?\n/).find((value) => value.startsWith("GOTRUE_JWT_SECRET="))?.slice(18);
assert.ok(secret);
const token = (role, sub) => { const header = encode({ alg: "HS256", typ: "JWT" }); const body = encode({ role, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 300, ...(sub ? { sub } : {}) }); return `${header}.${body}.${createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url")}`; };

(async () => {
  const user = randomUUID();
  const other = randomUUID();
  const phone = fixturePhone(user);
  query(`INSERT INTO auth.users(instance_id,id,aud,role,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES ('00000000-0000-0000-0000-000000000000','${user}','authenticated','authenticated','{}','{}',now(),now()), ('00000000-0000-0000-0000-000000000000','${other}','authenticated','authenticated','{}','{}',now(),now());`);
  try {
    const service = createClient("http://127.0.0.1:54321", token("service_role"), { auth: { persistSession: false } });
    const anon = createClient("http://127.0.0.1:54321", token("anon"), { auth: { persistSession: false } });
    const authenticated = createClient("http://127.0.0.1:54321", token("authenticated", user), { auth: { persistSession: false } });
    const reserved = await service.rpc("reserve_seller_phone_verification_challenge_service", { p_user_id: user, p_phone_e164: phone });
    assert.ifError(reserved.error);
    const challenge = Array.isArray(reserved.data) ? reserved.data[0] : reserved.data;
    assert.equal(challenge.outcome, "reserved");
    const marked = await service.rpc("mark_seller_phone_verification_challenge_sent_service", { p_challenge_id: challenge.challenge_id, p_provider_reference: fixtureReference });
    assert.ifError(marked.error); assert.equal(marked.data, true);
    const lookup = await service.rpc("get_seller_phone_verification_challenge_service", { p_user_id: user, p_challenge_id: challenge.challenge_id });
    assert.ifError(lookup.error); assert.equal((Array.isArray(lookup.data) ? lookup.data[0] : lookup.data).phone_e164, phone);
    const cross = await service.rpc("get_seller_phone_verification_challenge_service", { p_user_id: other, p_challenge_id: challenge.challenge_id });
    assert.ifError(cross.error); assert.deepEqual(cross.data, []);
    const deniedAnon = await anon.rpc("reserve_seller_phone_verification_challenge_service", { p_user_id: user, p_phone_e164: phone });
    const deniedAuthenticated = await authenticated.rpc("reserve_seller_phone_verification_challenge_service", { p_user_id: user, p_phone_e164: phone });
    assert.ok(deniedAnon.error && deniedAuthenticated.error);
    console.log("PASS SELL-SEC-04B0A Data API service/anon/authenticated matrix");
  } finally {
    query(`DELETE FROM auth.users WHERE id IN ('${user}','${other}');`);
    assert.equal(query(`SELECT count(*) FROM identity.seller_phone_verification_challenges WHERE user_id IN ('${user}','${other}')`)[0], "0");
    assert.equal(query(`SELECT count(*) FROM identity.seller_phone_verifications WHERE user_id IN ('${user}','${other}')`)[0], "0");
  }
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
